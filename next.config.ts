import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `ws` picks its masking implementation with a try/catch around
  // require("bufferutil"), falling back to a JS version when the native addon is
  // absent. Bundling flattens that away and leaves an empty stub, so the first
  // WebSocket frame dies on "bufferUtil.mask is not a function" — which surfaces
  // as an AdapterError on the very first Neon query. Keeping ws and the Neon
  // driver external means a plain node require at runtime, fallback intact.
  serverExternalPackages: ["ws", "@neondatabase/serverless"],
};

export default nextConfig;
