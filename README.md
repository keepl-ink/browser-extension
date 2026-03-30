# Keepl.ink — Browser Extension

A cross-browser extension that lets you save, search, and chat with your browsing history via an optional self-hosted backend. Chrome uses a side panel; Firefox uses a sidebar.
---

## Development

```bash
npm install
npm run dev:chrome
npm run dev:firefox
npm run build
```

Browser-specific build outputs are written to `dist/chrome` and `dist/firefox`. Zip archives are written to `release/`.

Load Chrome builds at `chrome://extensions` and Firefox builds from `about:debugging#/runtime/this-firefox`.

> After editing `manifest.config.ts` or the background service worker, reload the extension in the browser — HMR does not cover these files.

### Firefox Development

Firefox does not currently have a reliable CRXJS HMR path for this MV3 setup. Use:

```bash
npm run dev:firefox
```

This runs a watch build into `dist/firefox`. Load `dist/firefox/manifest.json` as a temporary add-on in Firefox and click **Reload** in `about:debugging` after rebuilds.

An experimental HMR command is still available as `npm run dev:firefox:hmr`, but Firefox may block the `http://localhost` dev imports.
