import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { Providers } from "@/app/providers";
import { ThemeScript } from "@/components/layout/ThemeScript";

import "./globals.css";

/**
 * **Inter — the prototype's own face.** Its app shell declares
 * `font-family:'Inter','Segoe UI',sans-serif` and embeds Inter as a `@font-face`;
 * this was Geist, which is a different typeface and made every screen read
 * slightly unlike the artefact the client signed off.
 *
 * `fallback` carries the prototype's second and third choices verbatim, so the
 * flash before the webfont resolves lands on the same glyphs it does there.
 *
 * Self-hosted by `next/font` at build time — WOFF2, `display: swap` by default,
 * no runtime request to Google, which is what keeps **NFR-05**'s air-gap intact.
 *
 * ⚠️ **NFR-07's Arabic layer is still owed.** `subsets: ["latin"]` is all Google
 * publishes for Inter; the Arabic text will fall through to `Segoe UI`. Geist had
 * exactly the same gap, so this is unchanged rather than newly broken — but it
 * has to be closed before the bilingual layer ships.
 */
const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  fallback: ["Segoe UI", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ELogbook",
    template: "%s · ELogbook",
  },
  description: "Digital logbook for recording, reviewing and signing entries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
