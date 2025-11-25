import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'dbforge.dev',
      'www.dbforge.dev',
      'localhost',
      '127.0.0.1',
      '79.100.101.80'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Monaco Editor into separate chunk
          'monaco-editor': ['@monaco-editor/react'],
          // Split Chart.js into separate chunk
          'charts': ['chart.js', 'react-chartjs-2'],
          // Split AG Grid into separate chunk
          'ag-grid': ['ag-grid-community', 'ag-grid-react'],
          // Split React core
          'react-vendor': ['react', 'react-dom'],
          // Split other vendor libraries
          'vendor': ['axios', 'framer-motion', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})