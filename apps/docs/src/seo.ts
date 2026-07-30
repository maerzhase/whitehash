import type { Metadata } from "next"

const FALLBACK_SITE_ORIGIN = "https://whitehash.dev"

export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : FALLBACK_SITE_ORIGIN)
).replace(/\/+$/, "")

export const SITE_NAME = "whitehash"
export const SITE_DESCRIPTION =
  "Keep fxhash generative art available without relying on third-party infrastructure: preserve it locally with the CLI or render it in your own app with the API and React layers."

export const API_SLUGS = [
  "whitehash-provider",
  "use-whitehash",
  "use-token",
  "use-wallet-tokens",
  "use-projects",
  "use-project",
  "use-gateway-image",
  "use-artwork-frame",
  "button",
  "card",
  "badge",
  "togglegroup",
  "field",
  "input",
  "textarea",
  "dialog",
  "tooltip",
  "spinner",
  "skeleton",
  "separator",
  "artwork",
  "token-details",
  "wallet-gallery",
  "project-browser",
  "project-gallery",
  "address-search",
  "wallet-search",
  "sort-toggle",
] as const

export interface PageSeo {
  title: string
  description: string
}

export const GUIDE_SEO: Record<string, PageSeo> = {
  "getting-started": {
    title: "Getting started",
    description: "Render one real fxhash token in a React page with a preview and live view.",
  },
  configuration: {
    title: "Configuration",
    description: "Configure the services, gateways, cache, and networks Whitehash uses.",
  },
  cli: {
    title: "Archive CLI",
    description:
      "Preserve fxhash artwork locally as an offline archive, or index projects and tokens into portable JSON.",
  },
  onchfs: {
    title: "Onchfs",
    description:
      "Resolve onchfs content from Tezos, Ethereum, or Base and run it without a hosted platform backend.",
  },
  theming: {
    title: "Theming and tokens",
    description: "Customize the Whitehash component system with its public CSS design tokens.",
  },
  variations: {
    title: "Explore variations",
    description: "Run an original generator with a different seed or fx(params).",
  },
  capture: {
    title: "Capture engine",
    description: "Create repeatable PNG or GIF captures from generative artwork.",
  },
}

export const UNDERSTAND_SEO: Record<string, PageSeo> = {
  overview: {
    title: "How the toolkit works",
    description:
      "Learn the simple model behind the toolkit: projects group artwork, and tokens identify iterations.",
  },
  "data-model": {
    title: "Projects and tokens",
    description:
      "Understand the two core objects: projects group artwork, and tokens identify individual iterations.",
  },
  sources: {
    title: "Where data comes from",
    description: "Trace ownership, metadata, previews, and artwork back to their public sources.",
  },
  urls: {
    title: "How artwork URLs are built",
    description:
      "See how a stored artwork reference becomes a browser-ready live artwork URL.",
  },
  glossary: {
    title: "Generative art glossary",
    description: "Definitions for the blockchain and generative-art terms used in the toolkit.",
  },
}

const API_DESCRIPTIONS: Record<string, string> = {
  "whitehash-provider": "Configure the Whitehash client, network mode, and cache for React.",
  "use-whitehash": "Access the configured Whitehash client, cache, and network mode.",
  "use-token": "Load one fxhash token from its network, collection, and edition number.",
  "use-wallet-tokens":
    "Read and normalize the fxhash tokens owned by a Tezos or EVM wallet address.",
  "use-projects": "Browse fxhash projects across supported Tezos and EVM chains.",
  "use-project": "Read an fxhash project and browse its minted generative-art iterations.",
  "use-gateway-image": "Load IPFS images with automatic gateway fallback.",
  "use-artwork-frame": "Control secure live-artwork iframe state in React.",
  artwork: "Show an fxhash token preview and its live artwork.",
  "token-details": "Show a token’s artwork, source details, and generative traits.",
  "wallet-gallery": "Build a navigable gallery of generative-art tokens owned by a wallet.",
  "project-browser": "Browse fxhash projects across supported networks.",
  "project-gallery": "Display a project and its minted generative-art iterations.",
  "address-search": "Accept and validate a Tezos or EVM wallet address.",
  "wallet-search": "Add a wallet-search dialog to a Whitehash interface.",
  "sort-toggle": "Switch the display order of projects or tokens.",
  tooltip: "Show accessible contextual information on hover, focus, or touch.",
}

export function apiSeo(slug: string): PageSeo {
  const title = slug
    .split("-")
    .map(part => (part === "whitehash" ? "Whitehash" : part[0]?.toUpperCase() + part.slice(1)))
    .join(" ")
    .replace(/^Use /, "use")
  return {
    title,
    description:
      API_DESCRIPTIONS[slug] ??
      `API reference, usage examples, and live output for the Whitehash ${title} component.`,
  }
}

export function pageMetadata(pathname: string, seo: PageSeo): Metadata {
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: pathname },
    openGraph: {
      type: "article",
      url: pathname,
      title: seo.title,
      description: seo.description,
      siteName: SITE_NAME,
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: "whitehash documentation" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/opengraph-image"],
    },
  }
}
