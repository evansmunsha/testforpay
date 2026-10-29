import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/videos/upload': ['./node_modules/ffprobe-static/bin/linux/x64/ffprobe'],
  },
  // Vercel runs Linux x64 only; the other platform binaries would exceed the 250 MB function limit.
  outputFileTracingExcludes: {
    '/api/videos/upload': [
      './node_modules/ffprobe-static/bin/darwin/**/*',
      './node_modules/ffprobe-static/bin/win32/**/*',
      './node_modules/ffprobe-static/bin/linux/ia32/**/*',
    ],
  },
};

export default nextConfig;
