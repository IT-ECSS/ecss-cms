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
    // Optimize aggressively for Azure free tier size limits
    target: 'es2015',
    minify: 'terser',
    sourcemap: false, // Disable sourcemaps to reduce size
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log statements
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        passes: 3 // Multiple compression passes
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      external: [], // Don't externalize any modules
      output: {
        // Split large chunks more granularly to stay under 250MB total
        manualChunks: (id) => {
          // React ecosystem - keep together
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // UI libraries - split further
          if (id.includes('@mui/material')) {
            return 'mui-material';
          }
          if (id.includes('@mui/x-data-grid')) {
            return 'mui-datagrid';
          }
          if (id.includes('@emotion')) {
            return 'emotion-vendor';
          }
          if (id.includes('@heroui')) {
            return 'heroui-vendor';
          }
          
          // Grid libraries - split into very small chunks
          if (id.includes('ag-grid-community')) {
            return 'ag-grid-core';
          }
          if (id.includes('ag-grid-enterprise')) {
            return 'ag-grid-enterprise';
          }
          if (id.includes('ag-grid-react')) {
            return 'ag-grid-react';
          }
          
          // Chart libraries - split individually
          if (id.includes('plotly.js')) {
            return 'plotly-vendor';
          }
          if (id.includes('react-plotly')) {
            return 'react-plotly-vendor';
          }
          if (id.includes('recharts')) {
            return 'recharts-vendor';
          }
          
          // DevExtreme - split into smaller pieces
          if (id.includes('devextreme-react')) {
            return 'devextreme-react';
          }
          if (id.includes('devextreme') && !id.includes('devextreme-react')) {
            return 'devextreme-core';
          }
          
          // Utility libraries - split into smaller groups
          if (id.includes('axios')) {
            return 'axios-vendor';
          }
          if (id.includes('exceljs')) {
            return 'excel-vendor';
          }
          if (id.includes('file-saver') || id.includes('xlsx')) {
            return 'file-utils';
          }
          if (id.includes('jose') || id.includes('crypto')) {
            return 'crypto-vendor';
          }
          
          // Date/Time libraries
          if (id.includes('react-datepicker') || id.includes('react-day-picker')) {
            return 'date-vendor';
          }
          
          // Motion/Animation
          if (id.includes('framer-motion')) {
            return 'motion-vendor';
          }
          
          // Bootstrap
          if (id.includes('react-bootstrap')) {
            return 'bootstrap-vendor';
          }
          
          // FontAwesome
          if (id.includes('@fortawesome')) {
            return 'fontawesome-vendor';
          }
          
          // Socket.io
          if (id.includes('socket.io')) {
            return 'socket-vendor';
          }
          
          // Microsoft libraries
          if (id.includes('@azure') || id.includes('@testing-library')) {
            return 'microsoft-vendor';
          }
          
          // Routing
          if (id.includes('react-router')) {
            return 'router-vendor';
          }
          
          // Other large libraries individually
          if (id.includes('@webdatarocks')) {
            return 'webdatarocks-vendor';
          }
          if (id.includes('@refinedev')) {
            return 'refinedev-vendor';
          }
          if (id.includes('react-select')) {
            return 'select-vendor';
          }
          if (id.includes('react-icons')) {
            return 'icons-vendor';
          }
          
          // Remaining node_modules - split by first letter to create smaller chunks
          if (id.includes('node_modules')) {
            const moduleName = id.split('node_modules/')[1]?.split('/')[0];
            if (moduleName) {
              const firstChar = moduleName[0].toLowerCase();
              if (['a', 'b', 'c'].includes(firstChar)) return 'vendor-abc';
              if (['d', 'e', 'f'].includes(firstChar)) return 'vendor-def';
              if (['g', 'h', 'i'].includes(firstChar)) return 'vendor-ghi';
              if (['j', 'k', 'l'].includes(firstChar)) return 'vendor-jkl';
              if (['m', 'n', 'o'].includes(firstChar)) return 'vendor-mno';
              if (['p', 'q', 'r'].includes(firstChar)) return 'vendor-pqr';
              if (['s', 't'].includes(firstChar)) return 'vendor-st';
              if (['u', 'v', 'w', 'x', 'y', 'z'].includes(firstChar)) return 'vendor-uvwxyz';
            }
            return 'vendor-misc';
          }
        },
        // Limit chunk size
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        }
      }
    },
    // Reduce chunk size limit for Azure Static Web Apps
    chunkSizeWarningLimit: 800, // 800KB limit to stay well under the 250MB total limit
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

