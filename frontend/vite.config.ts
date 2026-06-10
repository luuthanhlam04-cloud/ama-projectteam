import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    basicSsl(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        injectionPoint: undefined
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        name: 'AMA Smart Scanner',
        short_name: 'AMA',
        description: 'AI-powered Medicine Scanner',
        theme_color: '#10B981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Bắt buộc: Lắng nghe trên mọi IP để Docker có thể ánh xạ ra ngoài
    port: 5173,      // Cập nhật về port 5173 theo yêu cầu
    strictPort: true,
    watch: {
      usePolling: true, // Bắt buộc cho môi trường Docker/WSL2 để tự động cập nhật UI khi sửa code
    },
    proxy: {
      '/api': 'http://backend:8000',
      '/static': 'http://backend:8000',
      '/images': 'http://backend:8000'
    }
  }
})