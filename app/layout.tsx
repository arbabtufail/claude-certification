import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Course Preparations",
  description: "Hands-on practice for Claude courses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav>
            <Link href="/" className="brand">Claude Course Preparations</Link>
            <Link href="/">Courses</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
