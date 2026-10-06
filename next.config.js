/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Electron packages the traced Node.js server instead of relying on
  // `next start` and the full development dependency tree.
  output: 'standalone',
  // There is another lockfile in the parent workspace. Keep tracing and
  // Turbopack output rooted in this application so server.js has a stable path.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
