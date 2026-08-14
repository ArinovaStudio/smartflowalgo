import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";
import Footer from "@/components/Footer";
import CookieConsent from "@/sections/other/Cookie";
import { cn } from "@/lib/utils";

import NextAuthProvider from "@/components/providers/NextAuthProvider";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Smartflow Trading | Gold, BTC & Forex Systematic Education",
  description: "Learn market-flow structure, follow educational setups, study risk-management guides, and run backtests inside the interactive sandbox.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body suppressHydrationWarning className="antialiased min-h-screen dark:bg-gray-950 bg-white">
        <NextAuthProvider>
          <Header />
          {children}
          <Footer />
          <CookieConsent />
        </NextAuthProvider>
      </body>
    </html>
  );
}
