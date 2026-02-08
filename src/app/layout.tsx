import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Camera, LayoutGrid } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "X-Snap - Evidence Snapshot Capture",
  description:
    "Capture and preserve evidence snapshots of X/Twitter posts with screenshots, PDFs, and cryptographic hashes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-card">
            <div className="container mx-auto flex h-14 items-center gap-6 px-4">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Camera className="h-5 w-5" />
                X-Snap
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Capture
                </Link>
                <Link
                  href="/gallery"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Gallery
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
          <footer className="border-t py-4 text-center text-xs text-muted-foreground">
            X-Snap - Evidence snapshot tool. Not affiliated with X Corp.
          </footer>
        </div>
      </body>
    </html>
  );
}
