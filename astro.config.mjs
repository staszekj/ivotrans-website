// @ts-check
import { defineConfig } from 'astro/config';

const gitSha = process.env.GIT_SHA || 'dev';
const buildDate = new Date().toISOString();

// https://astro.build/config
export default defineConfig({
  redirects: {
    '/': '/pl/',
  },
  server: {
    port: 4321,
    strictPort: true, // Fail if port 4321 is already in use
  },
  vite: {
    define: {
      __GIT_SHA__: JSON.stringify(gitSha),
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
  },
});
