import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use relative base so built assets work when served under Home Assistant Ingress
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (!id.includes('node_modules')) return null;

          // react-dom often contains runtime code that can be large; isolate it
          if (id.includes('react-dom')) return 'vendor_react_dom';

          // react (core) separate
          if (id.includes('react')) return 'vendor_react';

          // lucide icons split
          if (id.includes('lucide-react')) return 'vendor_lucide';

          // websocket and file-watching libs
          if (id.includes('ws')) return 'vendor_ws';
          if (id.includes('chokidar')) return 'vendor_chokidar';

          // Group remaining node_modules into a vendor chunk
          return 'vendor';
        }
      }
    }
  }
})
