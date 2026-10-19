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

/**
 * Geocode / Search places via OpenStreetMap Nominatim API.
 * Biased towards Delhi NCR coordinates for instant relevant delivery results.
 */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    // Delhi NCR bounding box: [minLon, maxLat, maxLon, minLat]
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&viewbox=76.84,28.88,77.38,28.40&bounded=0&limit=6&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => ({
      place_id: item.place_id,
      display_name: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type || item.class,
    }));
  } catch (err) {
    console.warn('Location search error:', err);
    return [];
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
