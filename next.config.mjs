/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 20
  },
  experimental: {
    workerThreads: false,
    cpus: 1
  }
};

export default nextConfig;
