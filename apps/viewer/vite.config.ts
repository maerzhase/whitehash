import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// base: "./" makes the built site portable to any static host, including
// subpath deploys (GitHub Pages) and IPFS.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
})
