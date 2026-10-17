import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerForge",
  description: "A practical career foundation for students and early-career job seekers."
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
