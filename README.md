# ChiCPStiers (MVP)

A Chrome extension MVP that adds **CPS Tier** badges to Realtor.com listing cards in Chicago by matching listing coordinates to CPS school-tier boundary polygons.

## Current MVP scope

- ✅ Chrome only (Manifest V3)
- ✅ Realtor.com pages only
- ✅ Primary extraction only from `#__NEXT_DATA__`
- ✅ Live CPS GeoJSON fetch on page load
- ❌ No caching layer yet
- ❌ No fallback extraction paths yet

## Repository files

- `manifest.json` — extension manifest and content-script registration
- `content.js` — data extraction, polygon matching, and badge injection
- `styles.css` — badge styling

## How to use

### 1) Load the extension in Chrome

1. Open `chrome://extensions`.
2. Toggle **Developer mode** ON (top-right).
3. Click **Load unpacked**.
4. Select this project folder (`ChiCPStiers`).

### 2) Open a supported page

1. Go to `https://www.realtor.com/`.
2. Search in a Chicago area where listings are shown as cards.
3. Wait for page content to load.

### 3) Confirm it is working

- Listing cards should show a blue badge like **"CPS Tier 1"**, **"CPS Tier 2"**, etc.
- As additional cards load (scrolling / dynamic updates), badges should be added to new cards as well.

## Troubleshooting

- **No badges appear**
  - Reload the page once after enabling the extension.
  - Open DevTools Console and check for fetch/network errors to `api.cps.edu`.
  - Confirm the page is on `https://www.realtor.com/*`.
- **Some listings have no badge**
  - Some cards may not expose usable coordinates in `#__NEXT_DATA__`.
  - A listing outside mapped polygons or with missing data will be skipped.
- **Badges duplicated**
  - The script is written to avoid duplicate badges per card; if you still see duplicates, refresh and report the page URL pattern.

## Development notes

- The extension currently fetches CPS polygons each page load.
- Future improvements can include caching, fallback extraction methods, and Firefox support.
