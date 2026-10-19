import {
  GraphInfo,
  MLMetrics,
  BenchmarkResult,
  RouteOptimizeRequest,
  RouteOptimizeResponse,
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export interface SearchLocationResult {
  place_id: number | string;
  display_name: string;
  name: string;
  lat: number;
  lon: number;
  type?: string;
}

const POPULAR_DEHRADUN_LANDMARKS: SearchLocationResult[] = [
  { place_id: 'ddn_geu', name: 'Graphic Era University (GEU)', display_name: 'Bell Road, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2704, lon: 77.9949, type: 'university' },
  { place_id: 'ddn_gehu', name: 'Graphic Era Hill University (GEHU)', display_name: 'Society Area, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2730, lon: 77.9980, type: 'university' },
  { place_id: 'ddn_bt', name: 'Buddha Temple (Mindrolling Monastery)', display_name: 'Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2606, lon: 78.0097, type: 'monument' },
  { place_id: 'ddn_sn', name: 'Subhash Nagar Market', display_name: 'Subhash Nagar, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2760, lon: 78.0020, type: 'commercial' },
  { place_id: 'ddn_mb', name: 'Mohbbewala Industrial Hub (Mobewalla)', display_name: 'Mohabewala, Saharanpur Road, Dehradun, Uttarakhand, 248002, India', lat: 30.2520, lon: 77.9890, type: 'industrial' },
  { place_id: 'ddn_ct', name: 'Clement Town Commercial Hub', display_name: 'Turner Road, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2685, lon: 78.0075, type: 'commercial' },
  { place_id: 'ddn_isbt', name: 'ISBT Dehradun Terminal', display_name: 'Haridwar Bypass Road, Majra, Dehradun, Uttarakhand, 248171, India', lat: 30.2858, lon: 78.0080, type: 'station' },
  { place_id: 'ddn_tr', name: 'Turner Road', display_name: 'Turner Road, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2735, lon: 78.0125, type: 'street' },
  { place_id: 'ddn_majra', name: 'Majra Chowk', display_name: 'Saharanpur Road, Majra, Dehradun, Uttarakhand, 248001, India', lat: 30.2800, lon: 78.0000, type: 'commercial' },
  { place_id: 'ddn_ghanta', name: 'Clock Tower (Ghanta Ghar)', display_name: 'Chowk, Rajpur Road, Paltan Bazaar, Dehradun, Uttarakhand, 248001, India', lat: 30.3245, lon: 78.0418, type: 'monument' },
  { place_id: 'ddn_paltan', name: 'Paltan Bazaar Market', display_name: 'Paltan Bazaar, Dehradun, Uttarakhand, 248001, India', lat: 30.3210, lon: 78.0380, type: 'commercial' },
  { place_id: 'ddn_railway', name: 'Dehradun Railway Station', display_name: 'Lakkhi Bagh, Dehradun, Uttarakhand, 248001, India', lat: 30.3155, lon: 78.0345, type: 'station' },
  { place_id: 'ddn_rajpur', name: 'Pacific Mall (Rajpur Road)', display_name: 'Rajpur Road, Jakhan, Dehradun, Uttarakhand, 248006, India', lat: 30.3550, lon: 78.0670, type: 'mall' },
  { place_id: 'ddn_premnagar', name: 'Prem Nagar Market', display_name: 'Prem Nagar, Chakrata Road, Dehradun, Uttarakhand, 248007, India', lat: 30.3390, lon: 77.9570, type: 'commercial' },
  { place_id: 'ddn_ballupur', name: 'Ballupur Chowk', display_name: 'Chakrata Road, Ballupur, Dehradun, Uttarakhand, 248001, India', lat: 30.3330, lon: 78.0120, type: 'commercial' },
  { place_id: 'ddn_fri', name: 'Forest Research Institute (FRI)', display_name: 'Kaulagarh Road, Dehradun, Uttarakhand, 248006, India', lat: 30.3420, lon: 77.9990, type: 'university' },
  { place_id: 'ddn_rispana', name: 'Rispana Pul / Vidhan Sabha', display_name: 'Haridwar Road, Dharampur, Dehradun, Uttarakhand, 248001, India', lat: 30.2980, lon: 78.0550, type: 'monument' },
  { place_id: 'ddn_raipur', name: 'Raipur Block', display_name: 'Raipur Road, Dehradun, Uttarakhand, 248008, India', lat: 30.3100, lon: 78.0900, type: 'suburb' },
  { place_id: 'ddn_karanpur', name: 'Karanpur Market', display_name: 'Karanpur, Dehradun, Uttarakhand, 248001, India', lat: 30.3280, lon: 78.0530, type: 'commercial' },
];

/**
 * Geocode / Search places with instant local matching for Dehradun and regional landmarks,
 * backed by OpenStreetMap Nominatim API for full street-level coverage worldwide.
 */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // 1. Instant local match for quick responsive UI
  const localMatches = POPULAR_DEHRADUN_LANDMARKS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.display_name.toLowerCase().includes(q)
  );

  try {
    // Biased to Dehradun valley [minLon, maxLat, maxLon, minLat]
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&viewbox=77.90,30.45,78.18,30.20&bounded=0&limit=8&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return localMatches;
    const data = await res.json();
    const remoteMatches: SearchLocationResult[] = data.map((item: any) => ({
      place_id: item.place_id,
      display_name: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type || item.class,
    }));

    // Merge without duplicate coordinates
    const combined = [...localMatches];
    remoteMatches.forEach((r) => {
      const isDuplicate = combined.some(
        (c) => Math.abs(c.lat - r.lat) < 0.003 && Math.abs(c.lon - r.lon) < 0.003
      );
      if (!isDuplicate) combined.push(r);
    });

    return combined.slice(0, 8);
  } catch (err) {
    console.warn('Online location search error, using local landmarks:', err);
    return localMatches;
  }
}


export async function fetchHealth(): Promise<{ status: string; app: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to reach backend health endpoint');
  return res.json();
}

export async function fetchGraphInfo(): Promise<GraphInfo> {
  const res = await fetch(`${API_BASE}/graph/info`);
  if (!res.ok) throw new Error('Failed to fetch graph info');
  return res.json();
}

/**
 * Fetch real street turn-by-turn road curves from OpenStreetMap OSRM routing engine.
 * Falls back to original graph polyline if offline or slow.
 */
async function fetchRealStreetPolyline(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  fallbackCoords: [number, number][]
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return fallbackCoords;
    const data = await res.json();
    if (data.routes && data.routes[0] && data.routes[0].geometry) {
      // OSRM returns [lon, lat], Leaflet needs [lat, lon]
      const coords = data.routes[0].geometry.coordinates.map(
        (pt: [number, number]) => [pt[1], pt[0]] as [number, number]
      );
      return coords.length > 0 ? coords : fallbackCoords;
    }
    return fallbackCoords;
  } catch {
    return fallbackCoords;
  }
}

export async function optimizeRoute(
  payload: RouteOptimizeRequest
): Promise<RouteOptimizeResponse> {
  const res = await fetch(`${API_BASE}/route/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Route optimization failed with status ${res.status}`
    );
  }

  const rawResult: RouteOptimizeResponse = await res.json();

  // Enrich each leg with real curved street geometry
  const enrichedLegs = await Promise.all(
    rawResult.legs.map(async (leg, idx) => {
      const fromStop = rawResult.ordered_stops[idx];
      const toStop = rawResult.ordered_stops[idx + 1];

      if (fromStop && toStop) {
        const realCoords = await fetchRealStreetPolyline(
          fromStop.lat,
          fromStop.lon,
          toStop.lat,
          toStop.lon,
          leg.polyline_coords
        );
        return {
          ...leg,
          polyline_coords: realCoords,
        };
      }
      return leg;
    })
  );

  return {
    ...rawResult,
    legs: enrichedLegs,
  };
}

export async function fetchMLMetrics(): Promise<MLMetrics> {
  const res = await fetch(`${API_BASE}/ml/metrics`);
  if (!res.ok) throw new Error('Failed to fetch ML metrics');
  return res.json();
}

export async function runLiveBenchmark(pairs: number = 30): Promise<BenchmarkResult> {
  const res = await fetch(`${API_BASE}/benchmark/run?pairs=${pairs}`);
  if (!res.ok) throw new Error('Failed to run live benchmark');
  return res.json();
}
