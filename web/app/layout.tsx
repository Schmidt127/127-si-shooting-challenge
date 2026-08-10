import type { Metadata } from "next";
import { Geist_Mono, Maven_Pro } from "next/font/google";

import "./globals.css";
import { APP_BASE_PATH, SITE_URL } from "@/lib/app-config";
import { cn } from "@/lib/utils";

const mavenPro = Maven_Pro({
  variable: "--font-maven-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Icon hrefs must include basePath. Production previously emitted `/favicon.png`
 * (root 404) instead of `/shoot/favicon.png` when metadata icons omitted basePath.
 */
const iconPng = `${APP_BASE_PATH}/favicon.png`;
const iconIco = `${APP_BASE_PATH}/favicon.ico`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Shooting Challenge | 127 Sports Intensity",
    template: "%s | Shooting Challenge",
  },
  description:
    "127 Sports Intensity Shooting Challenge — leaderboard, homework, tutorials, levels, and more.",
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: iconIco, sizes: "any" },
      { url: iconPng, type: "image/png" },
    ],
    apple: [{ url: iconPng, type: "image/png" }],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", mavenPro.variable, geistMono.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
