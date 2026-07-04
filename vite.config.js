import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        'supreme-view': resolve(__dirname, 'supreme-view.html'),
      },
    },
  },
})
