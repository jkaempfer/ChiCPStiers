const CPS_URL = 'https://api.cps.edu/maps/cps/GeoJSON?mapname=TIER&year=2026';

let tierFeatures = null;
let recordsById = new Map();
let recordsByPath = new Map();

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

function normalizePath(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url, location.origin);
    return u.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function extractPropertyIdFromPath(path) {
  if (!path) return null;
  const m = path.match(/_M(\d{4,})$/);
  return m ? m[1] : null;
}

function extractListingRecords(nextData) {
  const found = [];
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
    const propertyId = String(node.property_id ?? node.propertyId ?? '').trim() || null;

    if (isNumber(lat) && isNumber(lng)) {
      const path = normalizePath(url);
      const idFromPath = extractPropertyIdFromPath(path);
      const finalId = propertyId || idFromPath;
      const dedupeKey = `${finalId || ''}|${path || ''}|${lat}|${lng}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        found.push({ path, propertyId: finalId, lat, lng });
      }
    }

    for (const key of Object.keys(node)) visit(node[key]);
  }

  visit(nextData);
  return found;
}

function indexRecords(records) {
  recordsById = new Map();
  recordsByPath = new Map();

  for (const record of records) {
    if (record.propertyId && !recordsById.has(record.propertyId)) recordsById.set(record.propertyId, record);
    if (record.path && !recordsByPath.has(record.path)) recordsByPath.set(record.path, record);
  }
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
    }
    if (geom.type === 'MultiPolygon') {
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
  const content = card.querySelector('[data-testid="card-content"]') || card;
  content.appendChild(badge);
}

function resolveRecordForCard(card) {
  const link = card.querySelector('a[href*="/realestateandhomes-detail/"]');
  if (!link) return null;

  const path = normalizePath(link.getAttribute('href'));
  const idFromPath = extractPropertyIdFromPath(path);

  if (idFromPath && recordsById.has(idFromPath)) return recordsById.get(idFromPath);
  if (path && recordsByPath.has(path)) return recordsByPath.get(path);
  return null;
}

function processListings() {
  const cards = document.querySelectorAll([
    'li[data-testid="property-card"]',
    'div[data-testid="property-card"]',
    'article[data-testid="property-card"]',
    'div[data-testid="rdc-property-card"]',
    '.BasePropertyCard'
  ].join(','));

  cards.forEach((card) => {
    const record = resolveRecordForCard(card);
    if (!record) return;
    const tier = getTierForPoint(record.lat, record.lng);
    if (!tier) return;
    injectBadge(card, tier);
  });
}

async function init() {
  const nextData = parseNextData();
  if (!nextData) return;

  const records = extractListingRecords(nextData);
  if (!records.length) return;
  indexRecords(records);

  const res = await fetch(CPS_URL);
  if (!res.ok) return;
  const geojson = await res.json();
  tierFeatures = geojson?.features ?? [];

  processListings();

  const observer = new MutationObserver(() => processListings());
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
