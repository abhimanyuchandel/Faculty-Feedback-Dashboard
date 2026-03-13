if (process.argv.includes("dev")) {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true
};

export default nextConfig;
