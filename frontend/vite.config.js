import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3080,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3081',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3081',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
