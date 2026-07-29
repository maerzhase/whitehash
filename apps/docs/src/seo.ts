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
  "Put fxhash generative art on the web or save it for later, using public data from Tezos, Ethereum, Base, IPFS, and onchfs."

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
    description: "Render a real fxhash artwork with a resilient preview and sandboxed live view.",
  },
  configuration: {
    title: "Configuration",
    description:
      "Configure Whitehash RPCs, indexers, IPFS gateways, caching, and network behavior.",
  },
  cli: {
    title: "Archive CLI",
    description:
      "Index fxhash projects and tokens into portable JSON or preserve a wallet as an offline archive.",
  },
  onchfs: {
    title: "Render onchfs artwork",
    description:
      "Resolve onchfs content from Tezos, Ethereum, or Base and run it without a hosted platform backend.",
  },
  theming: {
    title: "Theming and tokens",
    description: "Customize the Whitehash component system with its public CSS design tokens.",
  },
  variations: {
    title: "Explore variations",
    description:
      "Run an original content-addressed generator with a different seed or declared fx(params).",
  },
  capture: {
    title: "Capture engine",
    description:
      "Create deterministic PNG or GIF captures from generative artwork in headless Chromium.",
  },
}

export const UNDERSTAND_SEO: Record<string, PageSeo> = {
  overview: {
    title: "How Whitehash works",
    description:
      "Learn the simple model behind Whitehash: projects make editions, and tokens identify those editions.",
  },
  "data-model": {
    title: "Projects and tokens",
    description:
      "Understand the two things Whitehash works with: projects and individual artwork editions.",
  },
  sources: {
    title: "Where the data comes from",
    description:
      "See where Whitehash gets ownership, descriptions, images, and artwork files.",
  },
  urls: {
    title: "How artwork URLs are built",
    description:
      "See how Whitehash turns a stored artwork reference into a browser-ready live artwork URL.",
  },
  glossary: {
    title: "Generative art glossary",
    description:
      "Plain-English definitions for the blockchain and generative-art words used by Whitehash.",
  },
}

const API_DESCRIPTIONS: Record<string, string> = {
  "whitehash-provider": "Configure the Whitehash client, network mode, and cache for React.",
  "use-whitehash": "Access the configured Whitehash client, cache, and network mode.",
  "use-token": "Read one normalized fxhash token from its chain, contract, and token ID.",
  "use-wallet-tokens":
    "Read and normalize the fxhash tokens owned by a Tezos or EVM wallet address.",
  "use-projects": "Browse fxhash projects across supported Tezos and EVM chains.",
  "use-project": "Read an fxhash project and browse its minted generative-art iterations.",
  "use-gateway-image": "Resolve IPFS images with ordered, automatic gateway fallback.",
  "use-artwork-frame": "Control secure live-artwork iframe state in React.",
  artwork: "Render an fxhash token preview and its live, deterministically seeded artwork.",
  "token-details": "Display normalized token provenance, artwork, and generative traits.",
  "wallet-gallery": "Build a navigable gallery of generative-art tokens owned by a wallet.",
  "project-browser": "Browse fxhash projects across supported networks.",
  "project-gallery": "Display a project and its minted generative-art iterations.",
  "address-search": "Accept and validate a Tezos or EVM wallet address.",
  "wallet-search": "Add a wallet-search dialog to a Whitehash interface.",
  "sort-toggle": "Switch the display order of projects or tokens.",
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
