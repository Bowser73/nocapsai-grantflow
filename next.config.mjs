import { fileURLToPath } from "node:url";
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
