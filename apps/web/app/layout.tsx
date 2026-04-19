import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const isPreviewDeployment = process.env.VERCEL_ENV === "preview";
const faviconPath = isPreviewDeployment
  ? "/favicon-preview.svg"
  : "/favicon.ico";
const metadataBase =
  process.env.VERCEL_ENV === "production" &&
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : process.env.VERCEL_URL
      ? new URL(`https://${process.env.VERCEL_URL}`)
      : new URL("https://onloop.work");

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "onloop",
    template: "%s | onloop",
  },
  description:
    "Email podcast ideas. Agents pick, research, voice, and publish real episodes. Built on AI SDK, Gateway, Sandbox, and Workflow SDK.",
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} font-sans overflow-x-hidden antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
