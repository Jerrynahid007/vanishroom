import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom middleware for SPA routing
const spaMiddleware = () => {
  let config
  return {
    name: 'spa-fallback',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    apply: 'serve',
    async middlewares(middlewares, server) {
      return () => {
        middlewares.use((req, res, next) => {
          // Skip if it's a static file or API request
          if (
            req.url.startsWith('/@') ||
            req.url.startsWith('/node_modules') ||
            req.url.startsWith('/socket.io') ||
            /\.\w+$/.test(req.url) // has file extension
          ) {
            return next()
          }

          // For all other routes, serve index.html
          const indexPath = path.resolve(config.root, 'index.html')
          try {
            const content = fs.readFileSync(indexPath, 'utf-8')
            res.end(content)
          } catch (e) {
            next()
          }
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaMiddleware()],
  server: {
    port: 5173,
    middlewareMode: false,
  },
  preview: {
    port: 5173,
  },
})
