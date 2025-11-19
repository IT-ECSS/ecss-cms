// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to copy staticwebapp.config.json to dist
    {
      name: 'copy-static-web-app-config',
      writeBundle() {
        copyFileSync('staticwebapp.config.json', 'dist/staticwebapp.config.json')
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // Allow network access
    historyApiFallback: true, // Enable SPA fallback for client-side routing
    hmr: {
      overlay: false // Disable error overlay for better performance
    },
    proxy: {
      // Proxy /whatsapp requests directly to backend (bypass Vite's size limits)
      '/whatsapp': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        proxyTimeout: 30000, // 30 second timeout for large uploads
        timeout: 30000
      }
    },
    watch: {
      // Reduce file watching for better performance
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  },
  preview: {
    port: 3000,
    historyApiFallback: true, // Enable SPA fallback for preview mode too
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
      external: [], // Don't externalize any modules for SPA
      output: {
        // More aggressive chunk splitting to stay under 250MB total (production only)
        manualChunks: process.env.NODE_ENV === 'production' ? (id) => {
          // Critical packages - keep very small
          if (id.includes('react/') || id.includes('react-dom/')) {
            return 'react-core';
          }
          
          // Large libraries - split into micro-chunks
          if (id.includes('exceljs/dist/es5/exceljs.browser.js')) {
            return 'excel-core';
          }
          if (id.includes('exceljs') && !id.includes('exceljs/dist/es5/exceljs.browser.js')) {
            return 'excel-utils';
          }
          
          // AG-Grid - split further
          if (id.includes('ag-grid-community/dist/lib/main.js')) {
            return 'ag-core';
          }
          if (id.includes('ag-grid-community') && !id.includes('main.js')) {
            return 'ag-modules';
          }
          if (id.includes('ag-grid-enterprise')) {
            return 'ag-enterprise';
          }
          if (id.includes('ag-grid-react')) {
            return 'ag-react';
          }
          
          // UI libraries - very small chunks
          if (id.includes('@mui/material')) {
            return 'mui-material';
          }
          if (id.includes('@mui/x-data-grid')) {
            return 'mui-grid';
          }
          if (id.includes('@emotion/react')) {
            return 'emotion-react';
          }
          if (id.includes('@emotion/styled')) {
            return 'emotion-styled';
          }
          
          // Chart libraries
          if (id.includes('plotly.js')) {
            return 'plotly';
          }
          if (id.includes('react-plotly')) {
            return 'react-plotly';
          }
          if (id.includes('recharts')) {
            return 'recharts';
          }
          
          // Utility micro-chunks
          if (id.includes('axios')) {
            return 'axios';
          }
          if (id.includes('file-saver')) {
            return 'file-saver';
          }
          if (id.includes('xlsx')) {
            return 'xlsx';
          }
          if (id.includes('jose')) {
            return 'jose';
          }
          
          // Date libraries
          if (id.includes('react-datepicker')) {
            return 'datepicker';
          }
          if (id.includes('react-day-picker')) {
            return 'daypicker';
          }
          
          // Animation
          if (id.includes('framer-motion')) {
            return 'motion';
          }
          
          // Icons and fonts
          if (id.includes('@fortawesome')) {
            return 'fontawesome';
          }
          if (id.includes('react-icons')) {
            return 'icons';
          }
          
          // Microsoft libraries
          if (id.includes('@azure/msal')) {
            return 'msal';
          }
          if (id.includes('@testing-library')) {
            return 'testing';
          }
          
          // Socket
          if (id.includes('socket.io')) {
            return 'socket';
          }
          
          // Other specific libraries ok
          if (id.includes('react-bootstrap')) {
            return 'bootstrap';
          }
          if (id.includes('react-router')) {
            return 'router';
          }
          if (id.includes('react-select')) {
            return 'select';
          }
          if (id.includes('@refinedev')) {
            return 'refine';
          }
          if (id.includes('@heroui')) {
            return 'heroui';
          }
          if (id.includes('web-vitals')) {
            return 'vitals';
          }
          if (id.includes('wx-react-grid')) {
            return 'wx-grid';
          }
          
          // Node modules - ultra-fine splitting by module name
          if (id.includes('node_modules')) {
            const moduleName = id.split('node_modules/')[1]?.split('/')[0];
            if (moduleName) {
              // Create individual chunks for each module to maximize splitting
              return `vendor-${moduleName.replace(/[@]/g, '').replace(/[^a-zA-Z0-9]/g, '-')}`;
            }
            return `vendor-misc`;
          }
        } : undefined, // Simplified chunking for development
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          return `assets/[name]-[hash:8].js`;
        },
        // Limit each chunk to maximum size
        maxParallelFileOps: 1,
      }
    },
    // Aggressive size limits for Azure free tier
    chunkSizeWarningLimit: 400, // 400KB limit per chunk
    // Enable maximum compression and tree-shaking
    reportCompressedSize: false, // Disable to speed up build
    commonjsOptions: {
      // Handle problematic packages with better tree-shaking
      include: [/node_modules/],
      transformMixedEsModules: true,
      strictRequires: true
    },
    // Enable tree-shaking for better size optimization
    treeshaking: true
  },
  optimizeDeps: {
    // Pre-bundle problematic dependencies for faster dev loading
    include: [
      'react',
      'react-dom',
      'axios',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'ag-grid-community',
      'ag-grid-react',
      'react-router-dom',
      'socket.io-client'
    ],
    force: false, // Don't force re-optimization every time
    esbuildOptions: {
      target: 'esnext' // Use latest JS features for faster bundling
    }
  },
  // Environment-specific settings
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
})

