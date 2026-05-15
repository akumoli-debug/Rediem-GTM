import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GTM Engine",
  description:
    "Account intelligence, signal scoring, enrichment workflows, formula columns, and CRM-ready exports."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
