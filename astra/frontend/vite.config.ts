import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }) as unknown as Plugin,
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8642',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8642',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Target modern Chromium (Electron 33 ships Chromium 130) to leverage
    // native ESM, optional chaining, and other modern syntax — smaller output
    // than transpiling to ES2017.
    target: 'chrome120',
    // Enable CSS code splitting so route chunks pull only their own styles
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    // Bundle splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // State management
          'state-vendor': ['zustand'],
          // Animation
          'animation-vendor': ['framer-motion'],
          // UI icons
          'icons-vendor': ['lucide-react'],
          // Charts
          'charts-vendor': ['recharts'],
          // Markdown rendering
          'markdown-vendor': ['react-markdown', 'react-syntax-highlighter'],
          // Data fetching
          'query-vendor': ['@tanstack/react-query'],
          // Utilities
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Optimize chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Minify for production
    minify: 'esbuild',
    // CSS optimization
    cssMinify: true,
    // Reduce asset size
    assetsInlineLimit: 4096,
  },
})
