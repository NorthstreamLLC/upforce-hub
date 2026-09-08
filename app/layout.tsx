import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Poppins } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

/* Self-hosted at build time rather than fetched from Google on first paint:
   one fewer render-blocking round trip, and the metrics are known up front so
   the numerals in the stat cards do not reflow once the display face lands. */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Upforce Hub",
  description:
    "Lead management for Upforce Marketing — every lead on a retarget clock.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0908" },
    { media: "(prefers-color-scheme: light)", color: "#F6F3EE" },
  ],
};

/**
 * The theme is read from a cookie on the server so the first paint is already
 * in the right palette. Resolving it in an effect instead would flash the dark
 * app at anyone who chose light, on every navigation.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = cookies().get("upf-theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${dmSans.variable} ${poppins.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
