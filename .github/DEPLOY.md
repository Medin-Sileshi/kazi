# Free-tier deploy checklist

## 1. Neon

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string into `DATABASE_URL`.
3. Apply schema from the repo root:

```bash
npm run db:push
# or: psql "$DATABASE_URL" -f drizzle/0000_init.sql
```

## 2. Vercel

1. Import this GitHub repo into Vercel (Hobby).
2. Set environment variables:

- `DATABASE_URL`
- `AUTH_SECRET` (`openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (OAuth web client; authorized redirect `https://<host>/api/auth/callback/google`)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` (BotFather bot + `/setdomain` to your host)
- `NEXTAUTH_URL` = `https://<your-vercel-host>`

3. Deploy.

## 3. GitHub Actions (ingester)

Repo → Settings → Secrets and variables → Actions:

- `DATABASE_URL` (same Neon URL)
- `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` (from my.telegram.org)
- `TELEGRAM_SESSION` (from `python ingester/login.py`)

The workflow [`.github/workflows/ingest.yml`](workflows/ingest.yml) runs every 15 minutes and supports manual **backfill**.

## 4. Channels

Edit [`ingester/channels.yaml`](../ingester/channels.yaml) to public channels your Telethon user can read, then commit and/or run a manual poll.
