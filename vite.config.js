import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'live-view': resolve(__dirname, 'live-view.html'),
        'halfmann-view': resolve(__dirname, 'halfmann-view.html'),
      },
    },
  },
})
