import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage avatars are added here once the project URL is known.
    ],
  },
};

export default nextConfig;
