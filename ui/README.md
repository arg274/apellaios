# Apellaios web UI

Svelte 5 (runes) + SvelteKit (static, hash router) + Tailwind CSS v4 + Bits UI, TypeScript.
The design follows the Apple Music web player (music.apple.com): glass sidebar and floating
player pill, flat artwork-tinted pages, Apple's grey scale and type ramp, set in Geist.

```sh
npm install
npm run dev        # UI on :4533, proxies the API to the backend on :4633 (ND_BACKEND_URL overrides)
npm test           # vitest
npm run check      # svelte-check (types + a11y)
npm run build      # writes build/, embedded by the Go server (ui/embed.go)
```

Run the backend on 4633 with `ND_PORT=4633`, or use `make dev` (foreman does the same).

## How the app is served

`build/index.html` is a Go `html/template`: `server/serve_index.go` injects
`window.__APP_CONFIG__` (and `__SHARE_INFO__` for public shares) per request. The same file is
served at `<BasePath>/app/` and `<BasePath>/share/<id>`, so routing lives in the URL hash and every
asset URL is relative (`scripts/postbuild.js` rewrites the few SvelteKit leaves absolute). In dev,
`src/lib/config.ts` fetches the backend's rendered index to get the real config.

## Rules

- **Svelte 5 only.** `$props`, `$state`, `$derived`, `$effect`, snippets, `{@attach}`, event
  attributes (`onclick`). No `export let`, `$:`, `on:`, `<slot>`, `createEventDispatcher`, or
  stores. Shared state is a class with rune fields in a `.svelte.ts` module (see `lib/state`).
- Prefer `$derived` over effects; an `$effect` that only sets state is almost always a `$derived`.
  Per-record optimistic state is keyed by id (`let starredBy = $state<Record<string, boolean>>({})`),
  never reset in an effect.
- **Styling**: Tailwind utilities using the semantic tokens in `src/app.css` only (`bg-page`,
  `text-label`, `text-label-2`, `text-label-3`, `bg-fill`, `bg-fill-2`, `border-divider`,
  `bg-hover`, `bg-selected`, `text-accent`, `bg-shelf`, `text-danger`...) and the type ramp
  (`text-large-title`, `text-title-1/2/3`, `text-body` 13px, `text-callout` 12px, `text-subhead`
  11px, `text-footnote` 10px). Never hard-code colours. Surfaces use `glass` (pills, cards over
  content), `glass-menu` (menus, dialogs, popovers) or `glass-sidebar`. Merge classes with `cn()`
  and build variants with `tv()` from `$lib/utils/cn`. Tailwind cannot see class names built at
  runtime, so never interpolate partial class names.
- **Components**: build on Bits UI primitives via `$lib/components/ui/*` (Button, IconButton,
  Dialog, ConfirmDialog, Select, Switch, Checkbox, SegmentedControl, Slider, Input, Textarea, Field,
  FormSection, FormPage, DataTable, Pagination, Tabs, Tooltip, Spinner, EmptyState). Icons come
  from `@lucide/svelte`.
- **Menus** are data: build `MenuEntry[]` with `menu()` from `ui/menu/types` and render them with
  `ActionMenu` ("..." button) or `ContextMenuArea` (right click). Song/album/artist/playlist menus
  live in `lib/actions.svelte.ts`; add to them rather than duplicating.
- **Data**: `lib/api/rest.ts` (json-server style CRUD for `/api/<resource>`), `lib/api/native.ts`
  (other native endpoints), `lib/api/subsonic.ts` (Subsonic calls, cover art and stream URLs).
  Pages load through `Loader` (one record) and `ListController` (paged lists), with URL-backed list
  params from `UrlListParams`, all in `lib/data.svelte.ts`. These refetch by themselves on server
  `refreshResource` events.
- **Routing**: links are `href('/album/123/show')` from `lib/nav.svelte.ts` (gives `#/...`);
  navigate with `navigate()`. Routes keep the legacy UI's URL shapes (`/album/:id/show`,
  `/playlist/:id/show`, `/user/:id` for edit) so old bookmarks work.
- **i18n**: `t('resources.album.fields.name')` from `$lib/i18n/index.svelte`. Reuse the existing
  keys in `src/lib/i18n/en.json` (shared with the server's translation files); new strings go
  under the `ui` namespace. The brand shown to users is `BRAND` from `$lib/brand`, and translated
  text is rebranded automatically. Never rename identifiers the server relies on.
- **Dialogs** that anyone can open (add to playlist, share, download, info...) are requested
  through `ui` in `lib/state/ui.svelte.ts` and mounted once in `components/dialogs/DialogHost.svelte`.
- **Playback** goes through `player` (`lib/player/player.svelte.ts`): `playTracks`, `playNext`,
  `addToQueue`, `playRadio`. Don't touch the `<audio>` element directly.
- **Page tint**: artwork pages call `ui.useTint(() => record.dominantColor)`, which gives Apple's
  flat page colour with blended secondary text. Full-bleed shelves below the tracklist use
  `bg-shelf`.
- Tests sit next to the code (`*.test.ts`). Pure logic gets unit tests; components get
  `@testing-library/svelte` tests where behaviour is non-trivial.
