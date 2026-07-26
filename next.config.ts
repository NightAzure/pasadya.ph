import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phone / LAN testing hits the PC by IP, not "localhost". Next 16 blocks
  // cross-origin /_next/* (especially HMR websockets) unless these hosts are
  // listed — that leaves SSR HTML without working client handlers, and made
  // the client-only Map FAB look "missing" on 192.168.x.x while localhost worked.
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
  ],
  devIndicators: false,
  reactStrictMode: true,
};

export default nextConfig;
