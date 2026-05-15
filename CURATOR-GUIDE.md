# Curator Guide

Succinct operating guide for the Innovation Studio Web Kiosk Gallery.

## What This Tool Is For

Use this app to build and maintain the gallery of web destinations shown on the Innovation Studio Chromebase kiosks.

Each card can include:

- A card title
- An author name
- A public destination URL
- A preview image URL
- An optional QR code toggle
- A QR image URL
- A short description

The app also stores:

- Idle reset timing
- Return hotkeys
- Backdrop colors
- Gallery appearance controls such as launch button color and text scale
- Import and export data for handoff between workstations

## Start Here

Open the kiosk gallery URL configured for the kiosk machine.

GitHub Pages deployment target:

`https://technobotanist.github.io/IS-WebKiosk/`

For local testing in this repo, use:

`http://127.0.0.1:5173/#gallery`

When locked, the app stays in gallery mode by default.

## Unlock The Editor

There is no visible password screen.

To unlock editing:

1. In gallery view, press and hold the subtitle text above the gallery title.
2. Hold for about 2 seconds.
3. The app will switch to the editor and show an unlock countdown.

Notes:

- The editor unlock lasts 10 minutes.
- Select `Relock` when you are done.
- If the timer expires, the app returns to gallery mode automatically.

## Studio Layout

The studio has two main working areas:

- `Collection Editor` at the top, which shows the gallery header content you are editing and gives quick access to collection controls.
- `Gallery cards`, which is the main work surface for selecting, editing, removing, and previewing cards.

The `Collection Editor` panel also includes live gallery appearance controls for:

- Launch button color
- Gallery title size
- Intro text size
- Card title size
- Card body size

Card rows show `Click to edit` or `Selected for editing` to indicate which card is active.

## Update A Gallery

1. Unlock the editor.
2. Work from the `Gallery cards` panel.
3. Select an existing card from the list, or choose `Add Card`.
4. Use `Edit` to open the card editor.
5. Edit the card fields, including an optional preview image URL and the QR code checkbox for gallery cards.
6. Use `Preview In Kiosk` from the `Gallery cards` panel or the card editor to test the live destination inside the kiosk frame.
7. Use `Done Editing` to close the card editor.

Default values for a new card:

- Title: `Exhibit #n`
- Author: `Jane Doe`
- Destination URL: `https://go.ncsu.edu/innovation-studio-news`
- QR code: Off
- QR image URL: empty until you turn QR on for that card
- Description:

```text
Libraries News:
Showing news stories tagged with "Innovation Studio"
```

## Collection Settings

Use `Collection Settings` to manage:

- Collection title and subtitle
- Gallery slug
- Intro text
- Backdrop gradient colors
- Idle reset seconds
- Return hotkeys

The `Collection Editor` card also gives direct access to:

- `Edit Details`
- `Refine Backdrop`
- `Tune Kiosk Rules`

Return hotkeys are the keys that send an open kiosk page back to the gallery home.

## Import And Export

- `Export` downloads the current collection as a JSON file.
- `Import` loads a previously exported JSON collection.
- `Restore Sample` replaces the current collection with the sample set.

Important:

- Changes save automatically in this browser on this machine.
- Export the collection if you need a backup or want to move it to another workstation.

## What Gallery Mode Does

In gallery mode:

- Visitors see the collection grid.
- Selecting a card opens the destination URL inside the kiosk viewer.
- The viewer shows the card description beside the live page and only shows a QR code when that card's QR checkbox is enabled.
- Idle reset closes the active page and returns to the gallery grid.
- Return hotkeys also send the session back to the gallery grid.

## Quick Operating Checklist

Before opening the kiosk to visitors:

1. Confirm each card has the correct public URL.
2. Confirm QR is enabled only on cards that should show a code, and confirm those cards have the correct QR image.
3. Use `Preview In Kiosk` on any changed card.
4. Confirm idle reset timing and return hotkeys.
5. Export the collection after major updates.
6. Relock the editor.

## Troubleshooting

If the editor does not open:

- Make sure you are holding the subtitle text in gallery view, not clicking a gallery card.
- Hold slightly longer than 2 seconds.
- Check whether the app is already unlocked and showing a countdown.

If a card does not launch:

- Confirm the destination URL is public and complete.
- Confirm the card is not missing its URL.

If changes disappear:

- Check whether the browser was reset or storage was cleared.
- Re-import the last exported collection JSON.