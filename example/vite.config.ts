import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/midi2musicxml/',
  plugins: [react()],
});
