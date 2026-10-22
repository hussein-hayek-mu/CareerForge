import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" }
    ] }];
  },
  // Trust this computer's actual LAN addresses for development assets/HMR.
  // This does not loosen origin checks for account/profile API mutations.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(addresses =>
    addresses?.filter(address => !address.internal && address.family === "IPv4").map(address => address.address) ?? []
  )
};

export default nextConfig;
