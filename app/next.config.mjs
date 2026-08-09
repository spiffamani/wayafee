/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi/walletconnect optional deps that must not break the browser bundle
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // stub out connectors we don't use (coinbase baseAccount pulls huge optional deps)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
      "@x402/evm": false,
      "@x402/svm": false,
      "@x402/types": false,
    };
    return config;
  },
};

export default nextConfig;
