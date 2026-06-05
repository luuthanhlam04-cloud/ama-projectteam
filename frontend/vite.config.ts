import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Bắt buộc để Docker mapping được cổng ra ngoài
    port: 3000,
    watch: {
      usePolling: true, // Giúp hot-reload hoạt động mượt hơn trên Docker Windows
    },
  },
})