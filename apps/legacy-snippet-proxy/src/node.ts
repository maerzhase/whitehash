/** Node entry point. `pnpm start` / `pnpm dev`. */
import { serve } from "@hono/node-server"
import { createApp } from "./app.js"

const port = Number(process.env.PORT ?? 3001)
const app = createApp()

serve({ fetch: app.fetch, port }, info => {
  console.log(`whitehash onchfs-proxy listening on http://localhost:${info.port}`)
})
