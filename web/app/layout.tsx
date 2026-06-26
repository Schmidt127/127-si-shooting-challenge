import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Maven_Pro } from "next/font/google";

import "./globals.css";

const mavenPro = Maven_Pro({
  variable: "--font-maven-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://hoopchallenges.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shooting Challenge | 127 Sports Intensity",
    template: "%s | Shooting Challenge",
  },
  description:
    "127 Sports Intensity Shooting Challenge — leaderboard, homework, tutorials, levels, and more.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mavenPro.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
