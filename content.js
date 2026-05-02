const CPS_URL = 'https://api.cps.edu/maps/cps/GeoJSON?mapname=TIER&year=2026';

let tierFeatures = null;

function parseNextData() {
  const node = document.querySelector('#__NEXT_DATA__');
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent);
  } catch {
    return null;
  }
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url, location.origin);
    return u.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function extractListingRecords(nextData) {
  const records = [];
  const seen = new Set();

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const lat = node.lat ?? node.latitude;
    const lng = node.lon ?? node.lng ?? node.longitude;
    const url = node.href ?? node.permalink ?? node.url ?? node.detailUrl;

    if (isNumber(lat) && isNumber(lng) && typeof url === 'string') {
      const normalized = normalizeUrl(url);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        records.push({ url: normalized, lat, lng });
      }
    }

    for (const key of Object.keys(node)) {
      visit(node[key]);
    }
  }

  visit(nextData);
  return records;
}

function pointInRing(point, ring) {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygonCoords) {
  if (!polygonCoords.length) return false;
  if (!pointInRing(point, polygonCoords[0])) return false;
  for (let i = 1; i < polygonCoords.length; i++) {
    if (pointInRing(point, polygonCoords[i])) return false;
  }
  return true;
}

function getTierForPoint(lat, lng) {
  if (!tierFeatures) return null;
  const point = [lng, lat];
  for (const feature of tierFeatures) {
    const geom = feature.geometry;
    if (!geom?.type || !geom?.coordinates) continue;

    if (geom.type === 'Polygon') {
      if (pointInPolygon(point, geom.coordinates)) return feature.properties?.TIER ?? null;
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates) {
        if (pointInPolygon(point, polygon)) return feature.properties?.TIER ?? null;
      }
    }
  }
  return null;
}

function injectBadge(card, tier) {
  if (card.querySelector('.cps-tier-badge')) return;
  const badge = document.createElement('div');
  badge.className = 'cps-tier-badge';
  badge.textContent = `CPS Tier ${tier}`;
  card.appendChild(badge);
}

function processListings(recordsByUrl) {
  const cards = document.querySelectorAll('li[data-testid="property-card"], .BasePropertyCard');
  cards.forEach((card) => {
    const link = card.querySelector('a[href*="/realestateandhomes-detail/"]');
    if (!link) return;
    const key = normalizeUrl(link.getAttribute('href'));
    if (!key) return;
    const record = recordsByUrl.get(key);
    if (!record) return;
    const tier = getTierForPoint(record.lat, record.lng);
    if (!tier) return;
    injectBadge(card, tier);
  });
}

async function init() {
  const nextData = parseNextData();
  if (!nextData) return;

  const listingRecords = extractListingRecords(nextData);
  if (!listingRecords.length) return;

  const recordsByUrl = new Map(listingRecords.map((r) => [r.url, r]));

  const res = await fetch(CPS_URL);
  if (!res.ok) return;
  const geojson = await res.json();
  tierFeatures = geojson?.features ?? [];

  processListings(recordsByUrl);

  const observer = new MutationObserver(() => processListings(recordsByUrl));
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
