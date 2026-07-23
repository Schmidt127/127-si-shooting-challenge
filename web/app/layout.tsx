import type { Metadata } from "next";
import { Geist_Mono, Maven_Pro } from "next/font/google";

import "./globals.css";
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
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
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
    <html lang="en" className={cn("font-sans", mavenPro.variable, geistMono.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
