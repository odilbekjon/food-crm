import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Mahalliy ishlab chiqish: `VITE_API_URL=/api` bo'lsa so'rovlar server/ ga yo'naltiriladi (bir origin: CORS va cookie muammosi yo'q).
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        rewrite: (url) => url.replace(/^\/api/, ''),
      },
    },
  },
})
