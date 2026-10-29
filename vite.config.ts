import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Set by the Pages workflow after GitHub determines the site's actual path.
  base: process.env.VITE_BASE_PATH || '/',
});
