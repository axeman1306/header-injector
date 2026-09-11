# HTTP Header Injector

Add, edit, and remove HTTP request headers per-URL, per-hostname, or by regex.
Chrome and Firefox, one shared codebase (Manifest V3 + `declarativeNetRequest`).

## Features

- Add any number of header rules
- Enable/disable each rule independently, or flip the master switch
- Set a header's value, or remove it entirely
- Filter by: all URLs, hostname, URL contains, or URL regex
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

- `src/types.ts` — rule + rule-set data model
- `src/browser-api.ts` — thin cross-browser shim (Firefox's promise-based `browser` vs Chrome's callback-based `chrome`)
- `src/dnr.ts` — maps rules to `declarativeNetRequest` dynamic rules (unit-tested in `src/dnr.test.ts`, no browser required)
- `src/storage.ts` — persists the rule set to `storage.local`
- `src/background.ts` — service worker that re-syncs DNR rules whenever storage changes
- `src/popup/` — the popup UI for managing rules
- `manifest/manifest.{chrome,firefox}.json` — per-target manifest, merged into `dist/<target>/manifest.json` at build time
