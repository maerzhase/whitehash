import type { NextConfig } from "next"

const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["geist", "@whitehash/chain-reader", "@whitehash/react", "@whitehash/resolve", "@whitehash/ui"],
}

export default config
