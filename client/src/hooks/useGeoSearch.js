import { useState } from 'react';
import { apiFetch } from '../services/api';

/* ── useGeoSearch ──────────────────────────────────────────────────────────
   The "קרוב אליי" filter: a search centre (`geo`) plus its radius. The centre
   can be set two ways — (A) a typed address geocoded by the backend, or (B) the
   device's current GPS position. Setting `geo` is what re-triggers the catalog
   search (useItemSearch watches it). Owns only the location concern; the rest of
   the filters live in useItemSearch. */
export function useGeoSearch() {
  const [geo, setGeo] = useState(null);   // { lat, lng } search centre
  const [addr, setAddr] = useState('');   // typed target address
  const [radiusKm, setRadiusKm] = useState(5);
  const [geoLoading, setGeoLoading] = useState(false);   // GPS in flight
  const [addrLoading, setAddrLoading] = useState(false); // address geocode in flight
  const [geoError, setGeoError] = useState('');

  /* (A) typed address → ask the backend to geocode it, then search around it. */
  async function searchByAddress(e) {
    e?.preventDefault();
    const q = addr.trim();
    if (!q) return;
    setAddrLoading(true); setGeoError('');
    try {
      const { lat, lng } = await apiFetch(`/items/geocode?q=${encodeURIComponent(q)}`);
      setGeo({ lat, lng });
    } catch {
      setGeoError('לא מצאנו את הכתובת הזו. נסו שם עיר או כתובת מלאה יותר.');
    } finally {
      setAddrLoading(false);
    }
  }

  /* (B) current GPS location */
  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('הדפדפן שלך לא תומך באיתור מיקום');
      return;
    }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError('לא הצלחנו לאתר את מיקומך. בדקו שהרשאת המיקום מאופשרת.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function clearLocation() { setGeo(null); setAddr(''); setGeoError(''); }

  return {
    geo, addr, setAddr, radiusKm, setRadiusKm,
    geoLoading, addrLoading, geoError,
    searchByAddress, useMyLocation, clearLocation,
  };
}
