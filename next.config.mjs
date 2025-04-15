
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      staleTimes: {
        dynamic: 0,
      },
    },
    reactStrictMode: false,
    images: {
        remotePatterns: [{hostname: "*"}]
    }
};

export default nextConfig;
