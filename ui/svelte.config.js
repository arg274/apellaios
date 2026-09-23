import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
  kit: {
    // The server embeds ui/build and renders index.html as a Go template, injecting the app
    // config per request. The app is mounted under an arbitrary BasePath (and also served
    // from /share/<id>), so routing lives in the hash and every asset URL stays relative.
    adapter: adapter({ pages: 'build', assets: 'build', fallback: undefined, strict: true }),
    router: { type: 'hash' },
    paths: { relative: true },
    files: { assets: 'public' },
    alias: {
      $components: 'src/lib/components',
    },
    serviceWorker: {
      // Registered manually in +layout.svelte so dev and share pages can opt out
      register: false,
    },
    version: {
      pollInterval: 0,
    },
  },
}

export default config
