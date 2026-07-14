import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        cesiumScene: fileURLToPath(new URL('./src/modules/builder/editor/map3d/cesiumScene.js', import.meta.url)),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'cesiumScene'
            ? 'assets/cesiumScene.js'
            : 'assets/[name].[hash].js'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
