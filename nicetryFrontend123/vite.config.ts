import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  // VVVV--- THÊM PHẦN NÀY ---VVVV
  define: {
    'global': 'window', // Cần cho thư viện STOMP
  },
  // ^^^^---------------------^^^^
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      }
    }
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
})
