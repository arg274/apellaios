// SvelteKit writes absolute asset URLs into the hash-router shell (it treats it like an SPA
// fallback page, where paths.relative does not apply). Navidrome serves the same index.html at
// <BasePath>/app/ and <BasePath>/share/<id>, with a BasePath only known at runtime, so every
// URL in the shell has to be document-relative. Chunks import each other relatively already.
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../build/index.html', import.meta.url)
const html = readFileSync(file, 'utf8')

const out = html
  // href="/x" and src="/x" (but not protocol-relative //host)
  .replace(/(href|src)="\/(?!\/)/g, '$1="./')
  // import("/_app/...") in the boot script
  .replace(/import\("\/_app\//g, 'import("./_app/')

if (/(?:href|src)="\/(?!\/)|import\("\//.test(out)) {
  console.error('postbuild: absolute URLs remain in build/index.html')
  process.exit(1)
}

writeFileSync(file, out)
writeFileSync(new URL('../build/.gitkeep', import.meta.url), '')
console.log('postbuild: relativised build/index.html')
