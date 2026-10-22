import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sandbox Bootstrapper",
    template: "%s | Sandbox Bootstrapper",
  },
  description: "Plan, approve, and verify a safe developer sandbox setup.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
