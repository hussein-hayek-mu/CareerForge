import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const nextConfig: NextConfig = {
  // Trust this computer's actual LAN addresses for development assets/HMR.
  // This does not loosen origin checks for account/profile API mutations.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(addresses =>
    addresses?.filter(address => !address.internal && address.family === "IPv4").map(address => address.address) ?? []
  )
};

export default nextConfig;
