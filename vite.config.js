import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/STH': {
        target: 'http://107.23.174.107:8666',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/STH/, '/STH')
      }
    }
  },
  resolve: {
    alias:{
      "@":path.resolve(__dirname, "./src")
    }
  }
})
