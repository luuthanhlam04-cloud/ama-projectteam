import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AMA Medical Assistant',
        short_name: 'AMA Chat',
        description: 'Trợ lý ảo tư vấn tủ thuốc gia đình',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'https://placehold.co/192x192.png', // Tạm dùng ảnh placeholder, bạn có thể thay icon thật sau
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://placehold.co/512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})