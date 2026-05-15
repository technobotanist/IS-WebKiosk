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

The default sample collection lives in `public/data/collection.json`.

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

## Kiosk behavior

- Studio mode is the authoring surface.
- Gallery mode is the presentation surface for the Chromebase.
- Opening a card launches the destination URL inside a kiosk frame.
- The configured hotkeys return the session to gallery home.
- Idle reset closes the active page and returns the session to the collection grid.

