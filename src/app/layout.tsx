import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { Zen_Dots } from "next/font/google";

const zenDots = Zen_Dots({ subsets: ["latin"], weight: "400", variable: "--font-zen-dots" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={zenDots.variable}>
      <body className="min-h-dvh bg-black text-white antialiased">
        <header className="sticky top-0 z-50 border-b border-neutral-800 bg-black/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-brand text-yellow-400 tracking-wide text-lg">JSG</Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-white/80 hover:text-yellow-400">Home</Link>
              <Link href="/search" className="text-white/80 hover:text-yellow-400">Search</Link>
              <Link href="/convert" className="text-white/80 hover:text-yellow-400">Convert</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

        <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-white/50">
          Built for shifts. Data via KicksDB.
        </footer>
      </body>
    </html>
  );
}
