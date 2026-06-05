import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GrantFlow AI",
    template: "%s | GrantFlow AI",
  },
  description:
    "AI-powered grant search, writing, and tracking for nonprofits and organizations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
