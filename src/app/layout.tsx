import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@/components/monitoring/analytics";
import { ErrorMonitor } from "@/components/monitoring/error-monitor";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

function getMetadataBase() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return new URL(appUrl);
}

export const metadata: Metadata = {
  title: {
    default: "StyleMate AI",
    template: "%s | StyleMate AI"
  },
  description:
    "AI outfit recommendations from your wardrobe, weather, occasions, vacations, seasons, and style preferences.",
  applicationName: "StyleMate AI",
  metadataBase: getMetadataBase(),
  keywords: [
    "AI wardrobe",
    "outfit recommendations",
    "personal styling",
    "wardrobe app",
    "fashion SaaS"
  ],
  authors: [{ name: "StyleMate AI" }],
  creator: "StyleMate AI",
  publisher: "StyleMate AI",
  openGraph: {
    type: "website",
    siteName: "StyleMate AI",
    title: "StyleMate AI",
    description: "AI wardrobe styling for outfits that fit the real day ahead."
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleMate AI",
    description: "AI wardrobe styling for outfits that fit the real day ahead."
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <ErrorMonitor />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
