import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['vert-idee.onrender.com'],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['vert-idee.onrender.com'],
  },
});
