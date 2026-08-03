import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  // sql.js is CommonJS; pre-bundling gives it ESM interop in dev.
  optimizeDeps: { include: ["sql.js"] },
  build: { target: "es2022" },
})
