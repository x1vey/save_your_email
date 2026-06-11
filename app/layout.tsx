import type { Metadata } from "next";
import "./globals.css";
import AuthBootstrap from "@/components/AuthBootstrap";

export const metadata: Metadata = {
  title: "MailCheck — Email Deliverability Diagnostic",
  description:
    "Find out why your emails land in spam. Live SPF/DKIM/DMARC scan plus an AI-guided audit of your sending practices, with concrete fixes.",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthBootstrap />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
