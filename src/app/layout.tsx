import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/variables.css";

export const metadata: Metadata = {
  title: "Management System",
  description: "Capstone project for a private law firm ;P",
  icons: "/favicon.png",
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
