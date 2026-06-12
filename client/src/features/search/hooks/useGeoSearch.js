import { useState } from 'react';
import { apiFetch } from '../../../shared/services/api';

export default function useGeoSearch() {
  const [geo, setGeo] = useState(null);   
  const [addr, setAddr] = useState('');  
  const [radiusKm, setRadiusKm] = useState(5);
  const [geoLoading, setGeoLoading] = useState(false);   
  const [addrLoading, setAddrLoading] = useState(false); 
  const [geoError, setGeoError] = useState('');

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

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 60000,
      });
    });
  }

  async function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('הדפדפן שלך לא תומך באיתור מיקום');
      return;
    }
    setGeoLoading(true); setGeoError('');
    try {
      const pos = await getCurrentPosition();
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setGeoError('לא הצלחנו לאתר את מיקומך. בדקו שהרשאת המיקום מאופשרת.');
    } finally {
      setGeoLoading(false);
    }
  }

  function clearLocation() { setGeo(null); setAddr(''); setGeoError(''); }

  return {
    geo, addr, setAddr, radiusKm, setRadiusKm,
    geoLoading, addrLoading, geoError,
    searchByAddress, useMyLocation, clearLocation,
  };
}
