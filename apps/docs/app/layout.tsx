import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import "../src/app.css"

export const metadata: Metadata = {
  title: { default: "whitehash — generative art without the platform", template: "%s · whitehash" },
  description:
    "Read and render fxhash generative art directly from Tezos, Ethereum, Base, IPFS, and onchfs.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "256x256" }],
    shortcut: "/logo.png",
    apple: [{ url: "/logo-original.png", type: "image/png", sizes: "1024x1024" }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
