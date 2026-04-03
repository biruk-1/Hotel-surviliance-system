import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return
            console.error(err)
          })
        },
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
        configure(proxy) {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return
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
})
