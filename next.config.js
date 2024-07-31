/** @type {import('next').NextConfig} */

const webpack = require('webpack');

const nextConfig = {
  transpilePackages: ['@admin/forms'],
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ["site", "app", "src"],
  },
  // productionBrowserSourceMaps: true,
  experimental: {
    // instrumentationHook: true,
  },

  reactStrictMode: false,
  webpack: (config, { dev, isServer }) => {
    if (isServer) {
      // config.devtool = 'source-map';
    }

    if (isServer) {
      // Automatically include 'thaumazo' in server-side builds
      config.plugins.push(
        new webpack.ProvidePlugin({
          thaumazoModels: ['@site/models', "default"], 
        })
      );
    }
    config.plugins.push(
      new webpack.ProvidePlugin({
        thaumazoAdmin: ["@site/admin", "default"], 
      })
    );

    return config;
  }
}

module.exports = nextConfig

