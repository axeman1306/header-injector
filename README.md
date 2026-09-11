# HTTP Header Injector

Add, edit, and remove HTTP request headers per-URL, per-hostname, or by regex.
Chrome and Firefox, one shared codebase (Manifest V3 + `declarativeNetRequest`).

## Features

- Add any number of header rules
- Enable/disable each rule independently, or flip the master switch
- Set a header's value, or remove it entirely
- Filter by: all URLs, hostname, URL contains, or URL regex
- Target the request or the response header
- Toolbar badge shows the count of active rules
- Export/import your rule set as JSON

## Build

```bash
bun install
bun run typecheck
bun test
bun run build      # writes dist/chrome and dist/firefox
```

## Load unpacked (development)

- **Chrome:** `chrome://extensions` → enable Developer Mode → Load unpacked → select `dist/chrome`
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `dist/firefox/manifest.json`

## Architecture

- `src/types.ts` — rule + rule-set data model, plus `normalizeRule()` for backward-compat when a field is added later
- `src/browser-api.ts` — thin cross-browser shim (Firefox's promise-based `browser` vs Chrome's callback-based `chrome`), resolved lazily so it stays swappable in tests
- `src/dnr.ts` — maps rules to `declarativeNetRequest` dynamic rules (unit-tested in `src/dnr.test.ts`, no browser required)
- `src/storage.ts` — persists the rule set to `storage.local` (unit-tested in `src/storage.test.ts`)
- `src/background.ts` — service worker that re-syncs DNR rules and the toolbar badge whenever storage changes
- `src/popup/` — the popup UI for managing rules (DOM behavior unit-tested in `src/popup/popup.test.ts` via `happy-dom`)
- `manifest/manifest.{chrome,firefox}.json` — per-target manifest, merged into `dist/<target>/manifest.json` at build time

## Testing

`bun test` covers the pure logic (rule → DNR mapping, storage backward-compat) and the popup's DOM behavior (render, add/remove/toggle a rule, field wiring) via `happy-dom` — no real browser needed for any of it. What unit tests can't cover: whether `declarativeNetRequest` actually rewrites headers on a live request, and whether the popup renders/looks right in a real Chrome or Firefox window. Those need manual (or Interceptor-driven) verification in an actual browser.
