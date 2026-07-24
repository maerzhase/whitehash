import type { MetadataRoute } from "next"
import { API_SLUGS, GUIDE_SEO, SITE_ORIGIN, UNDERSTAND_SEO } from "../src/seo"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/llms/",
    ...Object.keys(GUIDE_SEO).map(slug => `/guide/${slug}/`),
    ...Object.keys(UNDERSTAND_SEO).map(slug => `/understand/${slug}/`),
    ...API_SLUGS.map(slug => `/docs/${slug}/`),
  ]

  return routes.map(path => ({
    url: `${SITE_ORIGIN}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/guide/getting-started/" ? 0.9 : 0.7,
  }))
}
