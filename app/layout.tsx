import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/context/WalletContext";
import { AequorProvider } from "@/lib/context/AequorContext";

export const metadata: Metadata = {
  title: "Aequor — Transparent moderation rulings, powered by GenLayer consensus.",
  description:
    "Aequor is a GenLayer-native moderation arbitration layer for communities and games. Transparent, appealable, rulebook-linked, and consistency-aware.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-canvas text-ink font-body">
        <WalletProvider>
          <AequorProvider>
            {children}
          </AequorProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
