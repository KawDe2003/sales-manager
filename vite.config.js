import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/quicksend': {
        target: 'https://quicksend.lk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/quicksend/, '/Client/api.php')
      },
      '/api/etechno': {
        target: 'http://83.147.38.130:666',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/etechno/, '')
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas']
        }
      }
    }
  }
})
