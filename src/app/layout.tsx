// src/app/layout.tsx

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Zen_Dots } from "next/font/google";
import "./globals.css";

const zenDots = Zen_Dots({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-zen-dots",
});

export const metadata: Metadata = {
  title: {
    default: "JSG Drip",
    template: "%s | JSG Drip",
  },
  description:
    "Search sneakers, streetwear, and collectibles using StockX marketplace data.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={zenDots.variable}>
      <body>
        <div className="flex min-h-dvh flex-col">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <div className="site-container flex h-16 items-center justify-between gap-4">
              <Link
                href="/"
                aria-label="JSG Drip home"
                className="group flex min-w-0 items-center gap-3 rounded-xl"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-400/40 bg-yellow-400 text-[10px] font-bold text-black shadow-[0_0_24px_rgba(250,204,21,0.16)]">
                  JSG
                </span>

                <span className="truncate font-brand text-base tracking-wide text-white transition-colors group-hover:text-yellow-400 sm:text-lg">
                  JSG Drip
                </span>
              </Link>

              <nav
                aria-label="Primary navigation"
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
              >
                <Link href="/" className="nav-link">
                  Home
                </Link>

                <Link href="/search" className="nav-link">
                  Search
                </Link>

                <Link href="/convert" className="nav-link">
                  <span className="sm:hidden">Sizes</span>
                  <span className="hidden sm:inline">Size Guide</span>
                </Link>
              </nav>
            </div>
          </header>

          <main className="site-container flex-1 py-8 sm:py-10 lg:py-12">
            {children}
          </main>

          <footer className="border-t border-white/10 bg-black/40">
            <div className="site-container flex flex-col gap-4 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-brand text-sm text-white">
                  JSG Drip
                </p>

                <p className="mt-1">
                  Sneakers, streetwear, and collectibles in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href="/search"
                  className="transition-colors hover:text-yellow-400"
                >
                  Search
                </Link>

                <Link
                  href="/convert"
                  className="transition-colors hover:text-yellow-400"
                >
                  Size Guide
                </Link>

                <span>Data via KicksDB</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}