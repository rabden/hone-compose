import type { Metadata } from "next";
import Script from "next/script";
import "../index.css";
import { OptionsStateProvider } from "@/options/options-context";
import OptionsShell from "@/options/options-shell";

export const metadata: Metadata = {
  title: "Hone — Settings",
  description:
    "Hone compose dashboard — configure providers, key bindings, customizations, history, and actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <OptionsStateProvider>
          <OptionsShell>{children}</OptionsShell>
        </OptionsStateProvider>
      </body>
    </html>
  );
}
