/** @type {import('next').NextConfig} */

const webpack = require('webpack');

const nextConfig = {
  eslint: {
    dirs: ["site", "app", "src"],
  },
  // productionBrowserSourceMaps: true,
  experimental: {
    // instrumentationHook: true,
  },

  // reactStrictMode: true,
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
