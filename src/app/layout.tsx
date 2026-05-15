import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rediem GTM Intelligence",
  description:
    "Rediem-specific GTM intelligence for community-driven consumer brands, Community Flywheel Ratio, activation ideas, buyer personas, and CRM-ready exports."
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
