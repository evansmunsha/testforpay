import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/videos/upload': ['./node_modules/ffprobe-static/bin/**/*'],
  },
};

export default nextConfig;
