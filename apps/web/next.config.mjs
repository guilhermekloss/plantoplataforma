/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @plantor/shared é transpilado pelo Next a partir do código TS do monorepo.
  transpilePackages: ['@plantor/shared'],
  experimental: {
    // Habilita instrumentation.ts → valida env no startup do servidor.
    instrumentationHook: true,
  },
  eslint: {
    // Lint roda como task separada (`turbo run lint`), não no build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
