import type { NextConfig } from "next";

// Vercel runs Linux x64 only; the other platform binaries would exceed the 250 MB function limit.
const otherFfprobeBinaries = [
  './node_modules/ffprobe-static/bin/darwin/**/*',
  './node_modules/ffprobe-static/bin/win32/**/*',
  './node_modules/ffprobe-static/bin/linux/ia32/**/*',
  './node_modules/ffprobe-static/bin/linux/arm64/**/*',
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffprobe-static'],
  outputFileTracingIncludes: {
    '/api/videos/upload': ['./node_modules/ffprobe-static/bin/linux/x64/ffprobe'],
    '/api/tasks/[taskId]/submit': ['./node_modules/ffprobe-static/bin/linux/x64/ffprobe'],
  },
  outputFileTracingExcludes: {
    '/api/videos/upload': otherFfprobeBinaries,
    '/api/tasks/[taskId]/submit': otherFfprobeBinaries,
  },
};

export default nextConfig;
