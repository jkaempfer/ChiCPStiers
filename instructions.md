# Chicago Real Estate CPS Tier Browser Extension

## Overview

Build a browser extension (Chrome + Firefox) that automatically tags real estate listings in Chicago with CPS school tiers based on geographic location. The system uses polygon-based geospatial classification to assign each property a tier label (Tier 1–4).

The extension enhances real estate browsing on sites like Realtor.com by overlaying school quality information directly onto listings.

---

## Core Objective

For every visible property listing:

* Extract latitude and longitude
* Determine whether it falls inside a CPS school tier polygon
* Display a tier badge directly on the listing UI

---

## Data Sources

### CPS School Tier Boundaries

* Endpoint:
  [https://api.cps.edu/maps/cps/GeoJSON?mapname=TIER&year=2026](https://api.cps.edu/maps/cps/GeoJSON?mapname=TIER&year=2026)

* Contains GeoJSON features representing school tier zones

* Each feature includes a property indicating tier classification (e.g., Tier 1–4)

---

## High-Level Architecture

### 1. Browser Extension Components

#### Content Script

* Runs on real estate listing pages
* Extracts property data (lat/lng)
* Injects tier labels into the DOM
* Observes page updates (infinite scroll / dynamic rendering)

#### Background Script

* Fetches CPS GeoJSON data
* Caches dataset locally (chrome.storage)
* Serves cached polygon data to content script

#### Utility Module

* Performs point-in-polygon checks
* Handles GeoJSON parsing and normalization

---

## Data Flow

1. User opens real estate site (e.g., Realtor.com)
2. Extension detects listing elements
3. Extract coordinates from:

   * Preferred: internal JSON state (e.g., **NEXT_DATA**)
   * Fallback: DOM scraping or API interception
4. Load CPS GeoJSON (cached or fetched)
5. For each listing:

   * Convert coordinates into GeoJSON point
   * Run point-in-polygon test against CPS boundaries
   * Assign tier
6. Inject UI badge into listing card

---

## Geospatial Logic

### Algorithm

* Use Turf.js:

  * booleanPointInPolygon

### Process

For each listing:

1. Create point [lng, lat]
2. Iterate CPS GeoJSON features
3. If point lies inside polygon:

   * Assign feature.properties.TIER
   * Break loop

---

## UI Injection

### Badge Design

* Text: "CPS Tier X"
* Lightweight overlay element
* Inserted into listing card DOM

### Requirements

* Non-blocking UI element
* Idempotent (no duplicate badges on re-render)

---

## Dynamic Page Handling

### MutationObserver

* Watch DOM changes for new listings
* Re-run classification only on new nodes

---

## Performance Considerations

* Pre-cache CPS GeoJSON
* Avoid repeated polygon parsing
* Optional optimization:

  * bounding-box pre-filter before full polygon test

---

## Edge Cases

* Missing or incomplete coordinates → skip classification
* Overlapping polygons → first match wins or priority rule
* Page re-renders → prevent duplicate DOM injection
* API failures → degrade gracefully (no labels)

---

## Extension Structure

```
manifest.json
content.js
background.js
geo/cps_tiers.json (cached optional)
turf.min.js
styles.css
```

---

## Key Design Decisions

* Prefer internal page state extraction over visible DOM scraping
* Cache geospatial dataset locally for performance
* Use deterministic spatial query (point-in-polygon)
* Treat extension as a reusable geospatial enrichment layer, not a one-off script

---

## Future Extensions

The architecture supports additional overlays:

* Crime risk maps
* Property tax zones
* Flood risk areas
* School ratings beyond CPS tiers
* Price-per-sqft scoring models

---

## Success Criteria

* All visible listings are tagged with correct CPS tier (when coordinates available)
* No UI duplication or rendering artifacts
* Works on infinite scroll pages
* Fast classification (<50ms per listing batch typical)
* Stable behavior across page refreshes

---

## Strategic Framing

This system is not just a UI enhancement. It is a geospatial intelligence layer that enriches consumer real estate interfaces with structured civic data.

The core value is not the CPS tier itself, but the ability to attach arbitrary polygon-based datasets to real-world listings at scale.
