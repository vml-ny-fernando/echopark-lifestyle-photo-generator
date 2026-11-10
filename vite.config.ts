import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Local development: `pnpm dev:api` (API on :3001) and `pnpm dev:web` (Vite).
// Vite proxies the server's routes; in production the API serves dist/ itself.
const api = `http://localhost:${process.env['API_PORT'] ?? '3001'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
    proxy: {
      '/trpc': api,
      '^/api([/?]|$)': api,
      '^/media([/?]|$)': api,
      '^/sign-(in|out)([/?]|$)': api,
      '/healthz': api,
    },
  },
});
