
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import midi2musicxmlPkg from '../package.json';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = '/midi2musicxml/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    {
      // In dev, serve files from public/ that live under a sub-path (e.g. impressum/)
      // directly, before Vite's base-redirect middleware can intercept the request.
      name: 'serve-public-subpaths-in-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith(`${BASE}impressum`)) {
            const relative = req.url.slice(BASE.length - 1); // e.g. /impressum/
            const normalized = relative.endsWith('/') ? `${relative}index.html` : relative;
            const filePath = path.resolve(__dirname, 'public', normalized.slice(1));
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(fs.readFileSync(filePath));
              return;
            }
          }
          next();
        });
      },
    },
  ],
  define: {
    __MIDI2MUSICXML_VERSION__: JSON.stringify(midi2musicxmlPkg.version)
  },
});
