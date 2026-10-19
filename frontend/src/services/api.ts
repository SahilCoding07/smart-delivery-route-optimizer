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

const POPULAR_DELHI_LANDMARKS: SearchLocationResult[] = [
  { place_id: 'loc_cp', name: 'Connaught Place (CP)', display_name: 'Connaught Place, New Delhi, Delhi, 110001, India', lat: 28.6315, lon: 77.2167, type: 'commercial' },
  { place_id: 'loc_kg', name: 'Karol Bagh Market', display_name: 'Karol Bagh, Central Delhi, Delhi, 110005, India', lat: 28.6514, lon: 77.1907, type: 'commercial' },
  { place_id: 'loc_ig', name: 'India Gate', display_name: 'Rajpath, India Gate, New Delhi, Delhi, 110001, India', lat: 28.6129, lon: 77.2295, type: 'monument' },
  { place_id: 'loc_cc', name: 'Chandni Chowk', display_name: 'Chandni Chowk, Old Delhi, Delhi, 110006, India', lat: 28.6506, lon: 77.2303, type: 'commercial' },
  { place_id: 'loc_ln', name: 'Lajpat Nagar Central Market', display_name: 'Lajpat Nagar II, South Delhi, Delhi, 110024, India', lat: 28.5700, lon: 77.2400, type: 'commercial' },
  { place_id: 'loc_hk', name: 'Hauz Khas Village', display_name: 'Hauz Khas, South Delhi, Delhi, 110016, India', lat: 28.5494, lon: 77.2001, type: 'commercial' },
  { place_id: 'loc_sk', name: 'Select CITYWALK Saket', display_name: 'Saket District Centre, Sector 6, Pushp Vihar, New Delhi, Delhi, 110017, India', lat: 28.5284, lon: 77.2188, type: 'mall' },
  { place_id: 'loc_aiims', name: 'AIIMS Hospital', display_name: 'Ansari Nagar, New Delhi, Delhi, 110029, India', lat: 28.5672, lon: 77.2100, type: 'hospital' },
  { place_id: 'loc_bk', name: 'Barakhamba Road', display_name: 'Barakhamba Road, Connaught Place, New Delhi, Delhi, 110001, India', lat: 28.6289, lon: 77.2340, type: 'commercial' },
  { place_id: 'loc_gm', name: 'Gole Market', display_name: 'Gole Market, New Delhi, Delhi, 110001, India', lat: 28.6340, lon: 77.2110, type: 'commercial' },
  { place_id: 'loc_rf', name: 'Red Fort (Lal Qila)', display_name: 'Netaji Subhash Marg, Lal Qila, Chandni Chowk, Delhi, 110006, India', lat: 28.6562, lon: 77.2410, type: 'monument' },
  { place_id: 'loc_dw', name: 'Dwarka Sector 10', display_name: 'Dwarka, South West Delhi, Delhi, 110075, India', lat: 28.5815, lon: 77.0580, type: 'suburb' },
  { place_id: 'loc_rohini', name: 'Rohini Sector 10', display_name: 'Rohini, North West Delhi, Delhi, 110085, India', lat: 28.7159, lon: 77.1171, type: 'suburb' },
  { place_id: 'loc_noida', name: 'Noida Sector 18', display_name: 'Sector 18, Noida, Gautam Buddha Nagar, Uttar Pradesh, 201301, India', lat: 28.5708, lon: 77.3260, type: 'commercial' },
  { place_id: 'loc_ggn', name: 'Cyber Hub Gurugram', display_name: 'DLF Cyber City, Gurugram, Haryana, 122002, India', lat: 28.4950, lon: 77.0890, type: 'commercial' },
  { place_id: 'loc_khan', name: 'Khan Market', display_name: 'Khan Market, Rabindra Nagar, New Delhi, Delhi, 110003, India', lat: 28.6003, lon: 77.2270, type: 'commercial' },
];

/**
 * Geocode / Search places with instant local matching for popular Delhi landmarks,
 * backed by OpenStreetMap Nominatim API for full coverage.
 */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // 1. Instant local match for quick responsive UI
  const localMatches = POPULAR_DELHI_LANDMARKS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.display_name.toLowerCase().includes(q)
  );

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&viewbox=76.84,28.88,77.38,28.40&bounded=0&limit=6&addressdetails=1`;

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
        (c) => Math.abs(c.lat - r.lat) < 0.005 && Math.abs(c.lon - r.lon) < 0.005
      );
      if (!isDuplicate) combined.push(r);
    });

    return combined.slice(0, 6);
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
