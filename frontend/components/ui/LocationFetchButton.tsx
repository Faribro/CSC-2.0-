'use client';

import React, { useState, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Language } from '@/lib/translations';

export interface LocationResult {
  fullAddress: string;
  state: string;
  district: string;
  pincode: string;
  subLocality: string;
  locality: string;
  houseNumber?: string;
  road?: string;
  colony?: string;
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
}

interface LocationFetchButtonProps {
  onLocationFetched: (result: LocationResult) => void;
  disabled?: boolean;
  className?: string;
  lang?: Language;
}

type FetchStatus = 'idle' | 'requesting' | 'geocoding' | 'success' | 'error';

// Canonical Indian state name normalisation map
const STATE_NORMALISE: Record<string, string> = {
  'maharashtra': 'Maharashtra',
  'karnataka': 'Karnataka',
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'andhra pradesh': 'Andhra Pradesh',
  'telangana': 'Telangana',
  'kerala': 'Kerala',
  'gujarat': 'Gujarat',
  'rajasthan': 'Rajasthan',
  'madhya pradesh': 'Madhya Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'west bengal': 'West Bengal',
  'bihar': 'Bihar',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'punjab': 'Punjab',
  'haryana': 'Haryana',
  'jharkhand': 'Jharkhand',
  'chhattisgarh': 'Chhattisgarh',
  'assam': 'Assam',
  'uttarakhand': 'Uttarakhand',
  'himachal pradesh': 'Himachal Pradesh',
  'goa': 'Goa',
  'tripura': 'Tripura',
  'meghalaya': 'Meghalaya',
  'manipur': 'Manipur',
  'nagaland': 'Nagaland',
  'arunachal pradesh': 'Arunachal Pradesh',
  'mizoram': 'Mizoram',
  'sikkim': 'Sikkim',
  'delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
  'jammu and kashmir': 'Jammu & Kashmir',
  'jammu & kashmir': 'Jammu & Kashmir',
  'ladakh': 'Ladakh',
  'chandigarh': 'Chandigarh',
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry',
  'andaman and nicobar islands': 'Andaman & Nicobar Islands',
  'andaman & nicobar islands': 'Andaman & Nicobar Islands',
  'dadra and nagar haveli and daman and diu': 'Dadra & Nagar Haveli and Daman & Diu',
  'lakshadweep': 'Lakshadweep',
};

function normaliseState(raw: string): string {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  return STATE_NORMALISE[key] ?? raw.trim();
}

function cleanDistrict(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\s+(District|district|Division|division)$/, '').trim();
}

// GPS Acquisition with Satellite Lock Filtering
async function acquireHighPrecisionGps(timeoutMs = 10000, targetAccuracy = 20): Promise<GeolocationPosition> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  return new Promise<GeolocationPosition>((resolve, reject) => {
    let bestPos: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    timer = setTimeout(() => {
      cleanup();
      if (bestPos) {
        resolve(bestPos);
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }, timeoutMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
            bestPos = pos;
          }
          if (pos.coords.accuracy <= targetAccuracy) {
            cleanup();
            resolve(pos);
          }
        },
        (err) => {
          if (bestPos) {
            cleanup();
            resolve(bestPos);
          } else {
            cleanup();
            reject(err);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );
    } catch (e) {
      cleanup();
      reject(e);
    }
  });
}

// Photon Public API (Komoot / Elasticsearch OSM Reverse Geocoder)
async function reverseGeocodeWithPhoton(lat: number, lng: number): Promise<any | null> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.features?.[0]?.properties || null;
  } catch {
    return null;
  }
}

// OpenStreetMap Nominatim
async function reverseGeocodeWithNominatim(lat: number, lng: number): Promise<any | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=en&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ESRI ArcGIS World Geocoder
async function reverseGeocodeWithEsri(lat: number, lng: number): Promise<any | null> {
  try {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&distance=100&f=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.address || null;
  } catch {
    return null;
  }
}

// BigDataCloud Fallback
async function reverseGeocodeWithBDC(lat: number, lng: number): Promise<LocationResult | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();

    const state = normaliseState(data.principalSubdivision || data.countryName || '');
    const rawDistrict = data.city || data.locality || data.localityInfo?.administrative?.[3]?.name || '';
    const district = cleanDistrict(rawDistrict);
    const pincode = data.postcode || '';
    const locality = data.locality || data.city || '';
    const subLocality = data.localityInfo?.informative?.find(
      (i: { description: string; name: string }) => i.description === 'neighbourhood'
    )?.name || data.locality || '';

    const parts: string[] = [];
    if (subLocality) parts.push(subLocality);
    if (locality && locality !== subLocality) parts.push(locality);
    if (district && district !== locality) parts.push(district);
    if (pincode) parts.push(pincode);

    return {
      fullAddress: parts.join(', '),
      state,
      district: district || locality,
      pincode,
      subLocality,
      locality,
    };
  } catch {
    return null;
  }
}

// Multi-Source Synthesizer
function synthesizeAddress(esriAddr: any, nomData: any, photonProps: any): LocationResult | null {
  const e = esriAddr || {};
  const n = nomData?.address || {};
  const p = photonProps || {};

  const cleanLandmark = (val: string | undefined | null): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (/^(yes|no|true|false|building|apartments|house|residential|commercial|unnamed|undefined|null)$/i.test(s)) {
      return '';
    }
    return s;
  };

  const rawHouseNum =
    e.AddNum ||
    e.StrucDet ||
    n.house_number ||
    n['addr:housenumber'] ||
    p.housenumber ||
    n['addr:flats'] ||
    n['addr:unit'] ||
    n['addr:door_number'] ||
    n['addr:plot_number'] ||
    '';

  const rawLandmark =
    cleanLandmark(p.name) ||
    cleanLandmark(e.PlaceName) ||
    cleanLandmark(n.amenity) ||
    cleanLandmark(n.building_name) ||
    cleanLandmark(n.house_name) ||
    cleanLandmark(n.shop) ||
    cleanLandmark(n.office) ||
    cleanLandmark(nomData?.name) ||
    '';

  const rawStreet =
    n.road ||
    n.street ||
    p.street ||
    e.Address ||
    n.pedestrian ||
    n.footway ||
    '';

  const rawColony =
    n.neighbourhood ||
    p.locality ||
    e.Sector ||
    n.subdivision ||
    '';

  const rawSuburb =
    n.suburb ||
    p.district ||
    e.District ||
    '';

  const rawCity =
    p.city ||
    e.City ||
    n.city ||
    n.town ||
    n.village ||
    n.municipality ||
    '';

  const rawDistrict =
    cleanDistrict(
      n.state_district ||
      n.county ||
      p.district ||
      e.Subregion ||
      n.district ||
      ''
    );

  const rawState =
    normaliseState(
      n.state ||
      p.state ||
      e.Region ||
      ''
    );

  const rawPincode =
    p.postcode ||
    n.postcode ||
    e.Postal ||
    e.PostalExt ||
    '';

  const streetParts: string[] = [];
  if (rawHouseNum) streetParts.push(rawHouseNum);
  if (rawStreet) streetParts.push(rawStreet);
  if (rawLandmark && rawLandmark !== rawStreet) streetParts.push(rawLandmark);
  if (rawColony && !streetParts.includes(rawColony)) streetParts.push(rawColony);
  if (rawSuburb && !streetParts.includes(rawSuburb)) streetParts.push(rawSuburb);
  if (rawCity && !streetParts.includes(rawCity)) streetParts.push(rawCity);
  if (rawDistrict && !streetParts.includes(rawDistrict) && rawDistrict !== rawCity) streetParts.push(rawDistrict);
  if (rawState) streetParts.push(rawState);
  if (rawPincode) streetParts.push(rawPincode);

  const fullAddress = streetParts.filter(Boolean).join(', ');
  const district = rawDistrict || cleanDistrict(rawCity);
  const state = rawState;
  const pincode = String(rawPincode).replace(/\D/g, '').slice(0, 6);

  if (!state && !district && !fullAddress) return null;

  return {
    fullAddress,
    state,
    district,
    pincode,
    subLocality: rawSuburb || rawColony || '',
    locality: rawCity || rawSuburb || '',
    houseNumber: rawHouseNum || undefined,
    road: rawStreet || undefined,
    colony: rawColony || rawLandmark || undefined,
  };
}

export function LocationFetchButton({
  onLocationFetched,
  disabled = false,
  className = '',
  lang = 'en',
}: LocationFetchButtonProps) {
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locatedDetail, setLocatedDetail] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    if (disabled || status === 'requesting' || status === 'geocoding') return;

    setErrorMsg(null);
    setLocatedDetail(null);
    setStatus('requesting');

    let coords: GeolocationCoordinates;
    try {
      const pos = await acquireHighPrecisionGps(8000, 20);
      coords = pos.coords;
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      const msg =
        geoErr.code === 1
          ? (lang === 'hi' ? 'स्थान अनुमति अस्वीकृत। कृपया ब्राउज़र में स्थान अनुमति दें।' : 'Location access denied. Please allow location permissions in your browser.')
          : geoErr.code === 2
          ? (lang === 'hi' ? 'जीपीएस अनुपलब्ध। कृपया स्थान सेवाएं सक्षम करें।' : 'GPS position unavailable. Please ensure GPS/location services are enabled.')
          : (lang === 'hi' ? 'जीपीएस अनुरोध का समय समाप्त। कृपया पुनः प्रयास करें।' : 'GPS request timed out. Please try again.');
      setErrorMsg(msg);
      setStatus('error');
      return;
    }

    setStatus('geocoding');
    let result: LocationResult | null = null;

    try {
      const [photonRes, nomRes, esriRes] = await Promise.allSettled([
        reverseGeocodeWithPhoton(coords.latitude, coords.longitude),
        reverseGeocodeWithNominatim(coords.latitude, coords.longitude),
        reverseGeocodeWithEsri(coords.latitude, coords.longitude),
      ]);

      const photonData = photonRes.status === 'fulfilled' ? photonRes.value : null;
      const nomData = nomRes.status === 'fulfilled' ? nomRes.value : null;
      const esriData = esriRes.status === 'fulfilled' ? esriRes.value : null;

      result = synthesizeAddress(esriData, nomData, photonData);
      if (result) {
        result.lat = coords.latitude;
        result.lng = coords.longitude;
        result.accuracyMeters = Math.round(coords.accuracy);
      }
    } catch (e) {
      console.warn('Geocoding synthesis error:', e);
    }

    if (!result || !result.state) {
      result = await reverseGeocodeWithBDC(coords.latitude, coords.longitude);
      if (result) {
        result.lat = coords.latitude;
        result.lng = coords.longitude;
        result.accuracyMeters = Math.round(coords.accuracy);
      }
    }

    if (!result || !result.state) {
      setErrorMsg(lang === 'hi' ? 'पता नहीं मिल सका। कृपया इंटरनेट जांचें।' : 'Could not detect address. Please check your connectivity and try again.');
      setStatus('error');
      return;
    }

    onLocationFetched(result);
    setStatus('success');

    const detailText = result.fullAddress
      ? result.fullAddress.split(',').slice(0, 2).join(', ')
      : result.locality || 'Address detected';

    setLocatedDetail(detailText);
    setTimeout(() => {
      setStatus('idle');
      setLocatedDetail(null);
    }, 6000);
  }, [disabled, onLocationFetched, status, lang]);

  const isLoading = status === 'requesting' || status === 'geocoding';

  const buttonStyle =
    status === 'success'
      ? 'bg-mint/50 border-2 border-mint text-success-ink shadow-comic'
      : status === 'error'
      ? 'bg-pink/40 border-2 border-border text-error-ink'
      : isLoading
      ? 'bg-lavender border-2 border-plum text-plum animate-pulse'
      : 'bg-plum/10 hover:bg-plum/20 text-plum border-2 border-plum/30 hover:border-plum/60 shadow-xs active:scale-[0.98]';

  return (
    <div className={`w-full flex flex-col items-start gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleFetch}
        disabled={disabled || isLoading}
        className={`w-full px-4 py-2.5 rounded-[12px] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none min-h-[44px] ${buttonStyle}`}
      >
        <Icon
          name={isLoading ? 'refresh' : status === 'success' ? 'check' : 'location'}
          className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
        />
        <span>
          {status === 'requesting'
            ? (lang === 'hi' ? 'सैटेलाइट जीपीएस प्राप्त हो रहा है...' : 'Acquiring Satellite GPS...')
            : status === 'geocoding'
            ? (lang === 'hi' ? 'पता खोजा जा रहा है...' : 'Resolving Live Address...')
            : status === 'success'
            ? (lang === 'hi' ? `सत्यापित: ${locatedDetail || 'पता प्राप्त हुआ'}` : `Detected: ${locatedDetail || 'Address Filled'}`)
            : (lang === 'hi' ? 'जीपीएस से पता भरें (Fetch Address)' : 'Fetch Live Address from GPS')}
        </span>
      </button>

      {errorMsg && (
        <p className="text-[11px] text-error-ink font-semibold flex items-center gap-1 mt-0.5" role="alert">
          <Icon name="info" className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span>{errorMsg}</span>
        </p>
      )}
    </div>
  );
}
