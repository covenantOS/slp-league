import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// SSR on Cloudflare Pages. Pages read live game data from a KV namespace
// (binding LEAGUE) at request time, so admin edits show up instantly for
// everyone. Update `site` once the production domain is known.
export default defineConfig({
  site: 'https://slp-league.pages.dev',
  trailingSlash: 'ignore',
  output: 'server',
  // platformProxy gives `astro dev` the local D1 + R2 bindings from wrangler.toml.
  adapter: cloudflare({ platformProxy: { enabled: true } }),
});
