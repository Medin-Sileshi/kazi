import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { accounts, profiles, users } from "@/lib/db/schema";

function verifyTelegramAuth(
  data: Record<string, string>,
  botToken: string,
): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secretKey).update(checkString).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(hash));
  } catch {
    return false;
  }
}

async function ensureProfile(userId: string) {
  const db = requireDb();
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (!existing[0]) {
    await db.insert(profiles).values({ userId });
  }
}

async function upsertGoogleUser(params: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  providerAccountId: string;
}) {
  const db = requireDb();
  const existingAccounts = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "google"),
        eq(accounts.providerAccountId, params.providerAccountId),
      ),
    )
    .limit(1);

  if (existingAccounts[0]) {
    await ensureProfile(existingAccounts[0].userId);
    return existingAccounts[0].userId;
  }

  if (params.email) {
    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, params.email))
      .limit(1);
    if (byEmail[0]) {
      await db.insert(accounts).values({
        userId: byEmail[0].id,
        type: "oauth",
        provider: "google",
        providerAccountId: params.providerAccountId,
      });
      await ensureProfile(byEmail[0].id);
      return byEmail[0].id;
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      name: params.name,
      email: params.email,
      image: params.image,
    })
    .returning();

  if (!user) throw new Error("Failed to create user");

  await db.insert(accounts).values({
    userId: user.id,
    type: "oauth",
    provider: "google",
    providerAccountId: params.providerAccountId,
  });
  await ensureProfile(user.id);
  return user.id;
}

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

providers.push(
  Credentials({
    id: "telegram",
    name: "Telegram",
    credentials: {
      id: { type: "text" },
      first_name: { type: "text" },
      last_name: { type: "text" },
      username: { type: "text" },
      photo_url: { type: "text" },
      auth_date: { type: "text" },
      hash: { type: "text" },
    },
    async authorize(credentials) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken || !credentials || !process.env.DATABASE_URL) return null;

      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === "string" && value.length > 0) {
          data[key] = value;
        }
      }

      if (!verifyTelegramAuth(data, botToken)) return null;

      const authDate = Number(data.auth_date);
      if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

      const telegramId = data.id;
      if (!telegramId) return null;

      const db = requireDb();
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
      const image = data.photo_url || null;

      const existingAccounts = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, "telegram"),
            eq(accounts.providerAccountId, telegramId),
          ),
        )
        .limit(1);

      if (existingAccounts[0]) {
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.id, existingAccounts[0].userId))
          .limit(1);
        const user = existingUsers[0];
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }

      const [user] = await db
        .insert(users)
        .values({
          name: name || data.username || "Telegram User",
          email: null,
          image,
        })
        .returning();

      if (!user) return null;

      await db.insert(accounts).values({
        userId: user.id,
        type: "oauth",
        provider: "telegram",
        providerAccountId: telegramId,
      });
      await ensureProfile(user.id);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  debug: process.env.NODE_ENV === "development",
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && process.env.DATABASE_URL) {
        const userId = await upsertGoogleUser({
          email: user.email,
          name: user.name,
          image: user.image,
          providerAccountId: account.providerAccountId,
        });
        user.id = userId;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (account?.provider === "google" && account.providerAccountId && user) {
        // ensure sub is our DB id after upsert
        if (user.id) token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (process.env.DATABASE_URL) {
          try {
            const db = requireDb();
            const rows = await db
              .select()
              .from(profiles)
              .where(eq(profiles.userId, token.sub))
              .limit(1);
            session.user.onboarded = rows[0]?.onboarded ?? false;
          } catch {
            session.user.onboarded = false;
          }
        }
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
