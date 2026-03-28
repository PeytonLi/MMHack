import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getPublicEnv } from "@/lib/env";

import "./globals.css";

const { NEXT_PUBLIC_APP_NAME } = getPublicEnv();

export const metadata: Metadata = {
  description: "Freshness-to-pricing hackathon MVP scaffold",
  title: NEXT_PUBLIC_APP_NAME,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist text-ink antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8 flex items-center justify-between rounded-full border border-ink/10 bg-white/70 px-5 py-3 backdrop-blur">
            <Link className="font-display text-xl tracking-wide text-ink" href="/">
              {NEXT_PUBLIC_APP_NAME}
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink/70">
              <Link href="/capture">Capture</Link>
              <Link href="/analysis">Analysis</Link>
              <Link href="/history">History</Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
