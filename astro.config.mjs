import { defineConfig } from 'astro/config';

// Static output (default). Deploys to Cloudflare Pages as plain files in dist/.
// Update `site` once the production domain is known.
export default defineConfig({
  site: 'https://slp-league.pages.dev',
  trailingSlash: 'ignore',
});
