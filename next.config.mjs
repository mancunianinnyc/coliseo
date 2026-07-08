/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Company logos are pulled from Clearbit at runtime.
    remotePatterns: [{ protocol: "https", hostname: "logo.clearbit.com" }],
  },
};

export default nextConfig;
