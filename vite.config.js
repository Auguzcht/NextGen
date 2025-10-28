import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({ 
  // Make the base path conditional like in TrackNToms
  base: mode === 'production' ? '/' : '/nextgen/',
  
  plugins: [
    react({
      // Include JSX in .js files
      include: "**/*.{jsx,js,ts,tsx}",
      // Auto-import React in all JSX files
      jsxImportSource: 'react',
    })
  ],
  
  server: {
    port: 3002,
    open: true,
    cors: true,
    watch: {
      usePolling: true
    },
    fs: {
      strict: false,
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '→', proxyReq.path);
          });
        }
      }
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    chunkSizeWarningLimit: 1600,
    assetsDir: 'assets',
    publicDir: 'public',
    emptyOutDir: true,
    
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'framer': ['framer-motion'],
          'supabase': ['@supabase/supabase-js']
        }
      },
    },
    assetsInlineLimit: 4096,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@context': path.resolve(__dirname, './src/context'),
      '@public': path.resolve(__dirname, './public')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
    jsx: 'automatic'
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      '@supabase/supabase-js'
    ]
  }
}))