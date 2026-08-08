import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserSite = repository?.endsWith('.github.io');

export default defineConfig({
  base: repository ? (isUserSite ? '/' : `/${repository}/`) : '/',
  build: { rollupOptions: { input: { public: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin.html'), hub: resolve(import.meta.dirname, 'hub.html') } } },
});
