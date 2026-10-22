import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./visual-system.css";

export const metadata: Metadata = {
  title: "CareerForge — Build your next chapter",
  description: "Build your skills. Find your direction. Shape your next chapter with CareerForge."
};

export const viewport: Viewport = { themeColor: "#111411", colorScheme: "dark" };

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
