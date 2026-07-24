import { Analytics } from "@vercel/analytics/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import "../src/app.css"
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "../src/seo"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: "whitehash — generative art from the source", template: "%s · whitehash" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "whitehash", url: "https://github.com/maerzhase/whitehash" }],
  creator: "whitehash",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: "whitehash — generative art from the source",
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "whitehash documentation" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "whitehash — generative art from the source",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "256x256" }],
    shortcut: "/logo.png",
    apple: [{ url: "/logo-original.png", type: "image/png", sizes: "1024x1024" }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "whitehash",
    description: SITE_DESCRIPTION,
    codeRepository: "https://github.com/maerzhase/whitehash",
    programmingLanguage: ["TypeScript", "JavaScript"],
    runtimePlatform: "Web browser",
    license: "https://opensource.org/license/mit",
  }

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  )
}
