/**
 * Vercel entry point (Edge/Node function). Vercel routes all paths here via the
 * catch-all; Hono handles the routing.
 */
import { handle } from "hono/vercel"
import { createApp } from "../src/app.js"

export const config = { runtime: "nodejs" }

const app = createApp()

export default handle(app)
