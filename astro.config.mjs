// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  server: {
    port: 4321,
    strictPort: true, // Fail if port 4321 is already in use
  },
  vite: {
    define: {
      __GIT_SHA__: JSON.stringify(process.env.GIT_SHA || 'dev'),
    },
  },
});
