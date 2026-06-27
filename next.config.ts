import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      'styled-components': 'styled-components',
    },
  },
};

export default nextConfig;
