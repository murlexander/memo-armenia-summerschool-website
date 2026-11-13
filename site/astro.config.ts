import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { contentDir, isPreview, previewDirs, siteDir } from './src/lib/build-env.ts';

const preview = isPreview();
const dirs = preview ? previewDirs() : undefined;

export default defineConfig({
  site: 'https://murlexander.github.io',
  base: '/memo-armenia-summerschool-website/',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
  ...(dirs ? { outDir: dirs.outDir, cacheDir: dirs.cacheDir } : {}),
  integrations: [mdx()],
  devToolbar: { enabled: false },
  vite: {
    server: {
      // Content may live outside the project (SITE_CONTENT_DIR).
      fs: { allow: [siteDir, contentDir()] },
    },
  },
});
