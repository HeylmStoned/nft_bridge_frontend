import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /node_modules\/thread-stream\/test/,
          use: 'ignore-loader',
        },
      ],
    };
    
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        'tap': 'commonjs tap',
      });
    }
    
    return config;
  },
};

export default nextConfig;
