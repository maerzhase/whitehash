import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import "../src/app.css"

export const metadata: Metadata = {
  title: { default: "whitehash — generative art without the platform", template: "%s · whitehash" },
  description: "Read and render fxhash generative art directly from Tezos, Ethereum, Base, IPFS, and onchfs.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}><body>{children}</body></html>
}
