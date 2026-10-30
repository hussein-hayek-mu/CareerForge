import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./visual-system.css";
import "./feature-system.css";
import "./supplied-builder.css";
import "./profile-history.css";
import "./experience.css";
import { AmbientBackground } from "@/components/ambient-background";

const title = "CareerForge — Build your next chapter";
const description = "Build your skills. Find your direction. Shape your next chapter with CareerForge.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "CareerForge",
  openGraph: { title, description, type: "website", siteName: "CareerForge" },
  twitter: { card: "summary", title, description }
};

export const viewport: Viewport = { themeColor: "#111411", colorScheme: "dark" };

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Extensions can add document-wrapper attributes; app descendants keep hydration checks.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="site-layer">{children}</div>
        {/* After the page in the DOM so the skip link stays first in the tab order; it is fixed-position, so it still paints behind the page. */}
        <AmbientBackground />
      </body>
    </html>
  );
}
