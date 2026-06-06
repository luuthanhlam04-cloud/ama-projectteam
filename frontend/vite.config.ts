import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // ... cấu hình PWA của UI team giữ nguyên
  ],
  // THÊM BLOCK SERVER NÀY VÀO ĐÂY:
  server: {
    host: '0.0.0.0', // Bắt buộc: Lắng nghe trên mọi IP để Docker có thể ánh xạ ra ngoài
    port: 3000,      // Bắt buộc: Ép Vite chạy đúng cổng 3000 như trong docker-compose.yml
    strictPort: true,
    watch: {
      usePolling: true, // Bắt buộc cho môi trường Docker/WSL2 để tự động cập nhật UI khi sửa code
    }
  }
})