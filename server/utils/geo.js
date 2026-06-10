'use strict';

/**
 * GeoJSON helpers shared by the items service and the location migration script.
 *
 * PRIVACY: every Point produced here is "fuzzed" to FUZZ_DECIMALS decimal places
 * before it is ever persisted. Three decimals is ~100 m at most latitudes — fine
 * for "find items in my neighbourhood" search, but coarse enough that the stored
 * coordinate can't pinpoint an owner's building. Coordinates therefore enter the
 * database already fuzzed; the search layer additionally never returns them.
 */

const FUZZ_DECIMALS = 3; // ~100 m neighbourhood radius

/** Round a single coordinate to FUZZ_DECIMALS places. */
function fuzzCoordinate(n) {
  const factor = 10 ** FUZZ_DECIMALS;
  return Math.round(Number(n) * factor) / factor;
}

/**
 * Normalise a raw location payload into a valid, privacy-fuzzed GeoJSON Point,
 * or null. Accepts `{ coordinates: [lng, lat] }` (GeoJSON) or a flat `{ lat, lng }`.
 * Returns null for anything malformed or out of range, so a broken Point is
 * never persisted.
 */
function toPoint(location) {
  if (!location || typeof location !== 'object') return null;

  let coords = location.coordinates;
  if (!coords && location.lat != null && location.lng != null) {
    coords = [location.lng, location.lat]; // GeoJSON order
  }
  if (!Array.isArray(coords) || coords.length !== 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

  return { type: 'Point', coordinates: [fuzzCoordinate(lng), fuzzCoordinate(lat)] };
}

module.exports = { FUZZ_DECIMALS, fuzzCoordinate, toPoint };
