'use strict';

const axios = require('axios');
const logger = require('./logger');


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

    return [lng, lat];
  } catch (err) {
    logger.warn(`Geocoding failed for "${q}": ${err.message}`);
    return null;
  }
}

module.exports = { geocodeAddress };
