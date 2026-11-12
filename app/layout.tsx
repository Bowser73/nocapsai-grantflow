import type { Metadata } from "next";
import { Archivo, Courier_Prime, Public_Sans } from "next/font/google";
import "./globals.css";

// Public Sans is the U.S. government's own typeface for forms and web pages —
// the right voice for grant paperwork. Archivo carries headlines; Courier Prime
// is used only for "typed-in" form fields and stamps.
const sans = Public_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const display = Archivo({ subsets: ["latin"], display: "swap", variable: "--font-display", axes: ["wdth"] });
const typed = Courier_Prime({ subsets: ["latin"], display: "swap", weight: ["400", "700"], variable: "--font-type" });

export const metadata: Metadata = {
  title: {
    default: "GrantFlow — find funders, draft honestly, never miss a deadline",
    template: "%s | GrantFlow",
  },
  description:
    "GrantFlow helps small nonprofits and small businesses find funders, draft grant applications from their own facts, and keep every deadline in view.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${typed.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
