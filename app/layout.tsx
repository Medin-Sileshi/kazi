import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Kazi",
  description:
    "Jobs from Telegram channels — Ethiopia local and global remote, sorted for humans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="shell">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="site-footer">
              Aggregated from public Telegram channels · Always open the source
              post to apply
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
