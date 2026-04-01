
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import midi2musicxmlPkg from '../package.json';

export default defineConfig({
  base: '/midi2musicxml/',
  plugins: [react()],
  define: {
    __MIDI2MUSICXML_VERSION__: JSON.stringify(midi2musicxmlPkg.version)
  },
});
