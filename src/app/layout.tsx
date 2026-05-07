import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Law Firm Management System",
  description: "Capstone project for a private law firm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
