import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/fast2sms': {
        target: 'https://www.fast2sms.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fast2sms/, '/dev/bulkV2'),
      },
    },
  },
});
