'use strict';


const FUZZ_DECIMALS = 3;

function fuzzCoordinate(n) {
  const factor = 10 ** FUZZ_DECIMALS;
  return Math.round(Number(n) * factor) / factor;
}

function toPoint(location) {
  if (!location || typeof location !== 'object') return null;

  let coords = location.coordinates;
  if (!coords && location.lat != null && location.lng != null) {
    coords = [location.lng, location.lat];
  }
  if (!Array.isArray(coords) || coords.length !== 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

  return { type: 'Point', coordinates: [fuzzCoordinate(lng), fuzzCoordinate(lat)] };
}

module.exports = { FUZZ_DECIMALS, fuzzCoordinate, toPoint };
