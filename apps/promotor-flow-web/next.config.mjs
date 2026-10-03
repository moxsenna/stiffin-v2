/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: { unoptimized: true },
  transpilePackages: [
    '@promotor/contracts',
    '@promotor/platform-core',
    '@promotor/api-client',
    '@promotor/promotor-flow-fixtures',
  ],
};

export default nextConfig;
