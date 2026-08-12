/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: [
    '@promotor/contracts',
    '@promotor/platform-core',
    '@promotor/api-client',
    '@promotor/promotor-class-fixtures',
  ],
};

export default nextConfig;
