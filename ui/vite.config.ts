import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

// Same convention as Procfile.dev: foreman gives the UI $PORT and the backend $PORT + 100
const frontendPort = parseInt(process.env.PORT ?? '') || 4533
const backendUrl = process.env.ND_BACKEND_URL || `http://localhost:${frontendPort + 100}`

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    host: true,
    port: frontendPort,
    strictPort: true,
    proxy: {
      '^/(auth|api|rest|backgrounds|share/(img|s|d))/.*': {
        target: backendUrl,
        changeOrigin: false,
      },
      // The backend's rendered index.html, read by src/lib/config.ts for the real app config
      '/__nd_index': {
        target: backendUrl,
        rewrite: () => '/app/',
      },
      // A share's public page, for developing the share player (`/?share=<id>`)
      '/__nd_share': {
        target: backendUrl,
        rewrite: (path) => path.replace(/^\/__nd_share/, '/share'),
      },
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 800,
  },
  test: {
    projects: [
      {
        extends: './vite.config.ts',
        plugins: [svelteTesting()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
          setupFiles: ['./vitest-setup.ts'],
        },
      },
    ],
  },
})
