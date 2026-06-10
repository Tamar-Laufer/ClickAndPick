'use strict';

const axios = require('axios');
const logger = require('./logger');

/**
 * Free-text address → [longitude, latitude] via OpenStreetMap's Nominatim.
 *
 * Geocoding is strictly best-effort: on no match, a non-2xx response, a timeout,
 * or any network error this resolves to `null` and never throws, so a flaky
 * third-party service can't break item creation or search. The caller decides
 * what to do with a null (fall back to another source, or report "not found").
 *
 * Note: Nominatim's usage policy requires a descriptive User-Agent and rate-limits
 * to ~1 request/second — fine for interactive item creation/search, but don't call
 * this in a tight loop (the migration script deliberately uses stored coordinates).
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = process.env.GEOCODER_USER_AGENT || 'Sharent/1.0 (peer-to-peer rental app)';
const TIMEOUT_MS = 5000;

async function geocodeAddress(address) {
  const q = String(address || '').trim();
  if (!q) return null;

  try {
    const { data } = await axios.get(NOMINATIM_URL, {
      params: { format: 'json', q, limit: 1 },
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'he,en' },
      timeout: TIMEOUT_MS,
    });

    if (!Array.isArray(data) || data.length === 0) return null;

    const lng = Number(data[0].lon);
    const lat = Number(data[0].lat);
    if (Number.isNaN(lng) || Number.isNaN(lat)) return null;

    return [lng, lat]; // GeoJSON order; caller fuzzes before persisting
  } catch (err) {
    logger.warn(`Geocoding failed for "${q}": ${err.message}`);
    return null;
  }
}

module.exports = { geocodeAddress };
