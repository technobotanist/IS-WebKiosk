# WebKiosking Studio

React and Vite prototype for building per-collection kiosk gallery pages. Each collection is a JSON document containing public destination URLs, author names, short descriptive copy, preview image links, an optional QR toggle with QR image links, idle reset timing, configurable return hotkeys, and collection-level appearance controls for the gallery.

## Curator Guide

For day-to-day curator use, see [CURATOR-GUIDE.md](CURATOR-GUIDE.md).

## What it does

- Provides an editor for one gallery collection at a time.
- Lets you add and remove gallery pages with title, author, destination URL, preview image URL, an optional QR toggle, QR image URL, and short description.
- Lets you tune collection-wide gallery styling such as the launch button color and text scale from the Collection Editor panel.
- Generates a locked gallery mode that launches those pages inside a kiosk shell.
- Supports JSON import and export for collection handoff.
- Lets you record custom hotkeys that return the kiosk from an open page back to the gallery home.
- Serves multiple named collections from one deployment, each addressable with a stable `?collection=<slug>` URL.
- Supports a follow-remote kiosk mode so display machines always load the latest published collection.

## Quick start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## GitHub Pages deploy

This repo now includes a GitHub Actions workflow that builds the app and publishes `dist` to GitHub Pages on every push to `main`.

In the repository's GitHub Pages settings, set the source to `GitHub Actions`. If Pages is set to deploy directly from the branch, GitHub will serve the raw source `index.html`, which requests `/src/main.tsx` and renders a blank page.

## Runtime sample data

The default sample collection lives in `public/data/collection.json`. Additional named collections live alongside it as `public/data/<slug>.json` and are selected with `?collection=<slug>` (see below). A demo second collection ships at `public/data/sample-showcase.json`.

```json
{
  "id": "innovation-studio",
  "title": "Innovation Studio",
  "subtitle": "Exhibition Space",
  "introText": "The Innovation Studio is an exhibition space for sharing student work with a broader audience, as either ongoing exhibits or one-time events.",
  "gallerySlug": "innovation-studio",
  "theme": {
    "backgroundTop": "#fbfdff",
    "backgroundMid": "#edf4fb",
    "backgroundBottom": "#d3e2fc",
    "cloudOne": "#c73523",
    "cloudTwo": "#2ca5bd",
    "launchButtonColor": "#c73523",
    "galleryTitleScale": 100,
    "galleryIntroScale": 100,
    "cardTitleScale": 100,
    "cardBodyScale": 100
  },
  "idleTimeoutSeconds": 120,
  "escapeHotkeys": ["Escape", "Control+Shift+H"],
  "entries": [
    {
      "id": "entry-ongoing-exhibits",
      "title": "Ongoing Exhibits",
      "author": "Course Collaborations",
      "description": "Flexible installations for student work that can combine digital media, physical material, and interactive elements for a broad public audience.",
      "destinationUrl": "https://example.com/innovation-studio/ongoing-exhibits",
      "showQrCode": false,
      "qrImageUrl": "qr/innovation-studio-exhibits.svg",
      "previewImageUrl": "thumbnails/innovation-studio-exhibits.svg"
    }
  ]
}

```

## Multiple collections and kiosk provisioning

One deployment can serve any number of named collections, and display kiosks can be set to always follow the published copy. Both behaviors are controlled from the URL, so a kiosk is provisioned by opening a single link.

### Named collections (`?collection=<slug>`)

- Add `?collection=<slug>` to the URL to load `public/data/<slug>.json` instead of the default `public/data/collection.json`.
- Host as many collections as you like by adding more `public/data/<slug>.json` files to the deployment.
- Each named collection keeps its own local edits — browser storage is namespaced per slug, so collections never overwrite one another.
- If the requested collection is missing, the app falls back to the default collection and shows a notice.
- Slugs are limited to lowercase letters, numbers, and hyphens.

A demo second collection ships at `public/data/sample-showcase.json`; load it with `?collection=sample-showcase`.

### Follow-remote kiosk mode (`?kiosk=1`)

By default the app is local-first: once a browser loads a collection, its own saved copy wins so curator edits persist. Public display kiosks usually want the opposite — always show the latest published collection.

- `?kiosk=1` (or `?role=kiosk`) turns on follow-remote mode; `?kiosk=0` turns it off.
- In follow-remote mode the published JSON is the source of truth: local storage never shadows it and local edits are not saved.
- The choice is remembered on the device, so you only pass the parameter once.
- A fleet-wide default can be set in `public/kiosk-config.json` with `"followRemote": true`.
- Precedence: URL parameter (remembered) > device setting > `kiosk-config.json` > off.

Collection JSON is always fetched with cache-busting, so an updated collection reaches kiosks on the next reload.

### Provisioning a kiosk

Point a short link at a stable, self-configuring URL and open it once on a new kiosk:

```text
go.ncsu.edu/is-kiosk-main  ->  https://technobotanist.github.io/IS-WebKiosk/?collection=main&kiosk=1
```

The kiosk loads the named collection, always shows the current published version, and will not drift. Repointing the short link later reconfigures kiosks without touching each device.

## Kiosk behavior

- Studio mode is the authoring surface.
- Gallery mode is the presentation surface for the Chromebase.
- Opening a card launches the destination URL inside a kiosk frame.
- The configured hotkeys return the session to gallery home.
- Idle reset closes the active page and returns the session to the collection grid.

