import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, './src'),
  base: './',
  publicDir: resolve(__dirname, './public'),
  build: {
    outDir: resolve(__dirname, './dist'),
    assetsDir: 'assets',
    emptyOutDir: true
  },
  server: {
    port: 8080,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      port: 8080,
      host: 'localhost'
    }
  }
}) 