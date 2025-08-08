// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,  // Set port to 3000
  },
  build: {
    // Optimize for Azure deployment
    target: 'es2015',
    minify: 'terser',
    sourcemap: false, // Disable sourcemaps in production to reduce size
    rollupOptions: {
      external: [], // Don't externalize any modules
      output: {
        // Split large chunks more granularly
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // UI libraries
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'ui-vendor';
          }
          // Grid libraries (split into smaller chunks)
          if (id.includes('ag-grid-community')) {
            return 'ag-grid-core';
          }
          if (id.includes('ag-grid-enterprise')) {
            return 'ag-grid-enterprise';
          }
          if (id.includes('ag-grid-react')) {
            return 'ag-grid-react';
          }
          // Chart libraries (split into smaller chunks)
          if (id.includes('plotly.js')) {
            return 'plotly-vendor';
          }
          if (id.includes('react-plotly')) {
            return 'react-plotly-vendor';
          }
          if (id.includes('recharts')) {
            return 'recharts-vendor';
          }
          // DevExtreme (large library, keep separate)
          if (id.includes('devextreme')) {
            return 'devextreme-vendor';
          }
          // Utility libraries
          if (id.includes('axios') || id.includes('jose') || id.includes('exceljs') || 
              id.includes('file-saver') || id.includes('xlsx')) {
            return 'utils-vendor';
          }
          // FontAwesome
          if (id.includes('@fortawesome')) {
            return 'fontawesome-vendor';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Limit chunk size
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000, // 1MB instead of 500KB
    // Enable compression
    reportCompressedSize: false, // Disable to speed up build
    commonjsOptions: {
      // Handle problematic packages
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    // Pre-bundle problematic dependencies
    include: [
      'devextreme',
      'devextreme-react',
      'react',
      'react-dom',
      'axios'
    ],
    force: true
  },
  // Environment-specific settings
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
})

