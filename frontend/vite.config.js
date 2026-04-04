import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Dev proxy target — use 127.0.0.1 (not localhost) to avoid IPv6 ::1 mismatches on Windows (ECONNRESET). */
function apiProxyTarget(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  return (
    env.VITE_API_PROXY_TARGET?.trim() ||
    // Match backend/.env.example (PORT=5001). If backend uses default PORT only, set VITE_API_PROXY_TARGET=http://127.0.0.1:5000
    'http://127.0.0.1:5001'
  )
}

export default defineConfig(({ mode }) => {
  const apiTarget = apiProxyTarget(mode)

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNABORTED') return
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
              console.error(
                `[vite] API proxy → ${apiTarget}: ${err.code} (${err.message}). Start the backend and ensure its PORT matches VITE_API_PROXY_TARGET (see frontend/.env.example).`,
              )
              return
            }
            console.error(err)
            if (res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'text/plain' })
              res.end(
                `Bad gateway: could not reach API at ${apiTarget}. Start the backend and ensure PORT matches VITE_API_PROXY_TARGET (see frontend/.env.example).`,
              )
            }
          })
        },
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
        configure(proxy) {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNABORTED') return
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
              console.error(
                `[vite] Socket proxy → ${apiTarget}: ${err.code}. Start the backend on the same port as VITE_API_PROXY_TARGET.`,
              )
              return
            }
            console.error(err)
          })
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket?.on?.('error', () => {})
          })
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test-setup.js',
        'src/test-utils.jsx',
        'src/**/*.test.{js,jsx}',
      ],
    },
  },
  }
})
