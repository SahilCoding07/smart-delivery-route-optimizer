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

const POPULAR_INDIA_LANDMARKS: SearchLocationResult[] = [
  // Dehradun & Uttarakhand
  { place_id: 'ddn_geu', name: 'Graphic Era University (GEU)', display_name: 'Bell Road, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2704, lon: 77.9949, type: 'university' },
  { place_id: 'ddn_gehu', name: 'Graphic Era Hill University (GEHU)', display_name: 'Society Area, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2730, lon: 77.9980, type: 'university' },
  { place_id: 'ddn_bt', name: 'Buddha Temple (Mindrolling Monastery)', display_name: 'Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2606, lon: 78.0097, type: 'monument' },
  { place_id: 'ddn_sn', name: 'Subhash Nagar Market', display_name: 'Subhash Nagar, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2760, lon: 78.0020, type: 'commercial' },
  { place_id: 'ddn_mb', name: 'Mohbbewala Industrial Hub (Mobewalla)', display_name: 'Mohabewala, Saharanpur Road, Dehradun, Uttarakhand, 248002, India', lat: 30.2520, lon: 77.9890, type: 'industrial' },
  { place_id: 'ddn_ct', name: 'Clement Town Commercial Hub', display_name: 'Turner Road, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2685, lon: 78.0075, type: 'commercial' },
  { place_id: 'ddn_isbt', name: 'ISBT Dehradun Terminal', display_name: 'Haridwar Bypass Road, Majra, Dehradun, Uttarakhand, 248171, India', lat: 30.2858, lon: 78.0080, type: 'station' },
  { place_id: 'ddn_tr', name: 'Turner Road', display_name: 'Turner Road, Clement Town, Dehradun, Uttarakhand, 248002, India', lat: 30.2735, lon: 78.0125, type: 'street' },
  { place_id: 'ddn_ghanta', name: 'Clock Tower (Ghanta Ghar)', display_name: 'Chowk, Rajpur Road, Paltan Bazaar, Dehradun, Uttarakhand, 248001, India', lat: 30.3245, lon: 78.0418, type: 'monument' },
  { place_id: 'ddn_paltan', name: 'Paltan Bazaar Market', display_name: 'Paltan Bazaar, Dehradun, Uttarakhand, 248001, India', lat: 30.3210, lon: 78.0380, type: 'commercial' },
  { place_id: 'ddn_rajpur', name: 'Pacific Mall (Rajpur Road)', display_name: 'Rajpur Road, Jakhan, Dehradun, Uttarakhand, 248006, India', lat: 30.3550, lon: 78.0670, type: 'mall' },
  { place_id: 'ddn_premnagar', name: 'Prem Nagar Market', display_name: 'Prem Nagar, Chakrata Road, Dehradun, Uttarakhand, 248007, India', lat: 30.3390, lon: 77.9570, type: 'commercial' },
  { place_id: 'ddn_fri', name: 'Forest Research Institute (FRI)', display_name: 'Kaulagarh Road, Dehradun, Uttarakhand, 248006, India', lat: 30.3420, lon: 77.9990, type: 'university' },

  // Delhi NCR
  { place_id: 'del_cp', name: 'Connaught Place (CP)', display_name: 'Connaught Place, New Delhi, Delhi, 110001, India', lat: 28.6315, lon: 77.2210, type: 'commercial' },
  { place_id: 'del_kb', name: 'Karol Bagh Market', display_name: 'Karol Bagh, Central Delhi, Delhi, 110005, India', lat: 28.6514, lon: 77.1907, type: 'commercial' },
  { place_id: 'del_aiims', name: 'AIIMS Hospital', display_name: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi, 110029, India', lat: 28.5672, lon: 77.2100, type: 'hospital' },
  { place_id: 'del_hk', name: 'Hauz Khas Village', display_name: 'Hauz Khas, South Delhi, Delhi, 110016, India', lat: 28.5494, lon: 77.2001, type: 'commercial' },
  { place_id: 'del_noida', name: 'Sector 18 Noida Market', display_name: 'Sector 18, Noida, Gautam Buddha Nagar, Uttar Pradesh, 201301, India', lat: 28.5708, lon: 77.3260, type: 'commercial' },
  { place_id: 'del_ggn', name: 'Cyber Hub Gurugram', display_name: 'DLF Cyber City, Sector 24, Gurugram, Haryana, 122002, India', lat: 28.4950, lon: 77.0890, type: 'commercial' },

  // Mumbai & Maharashtra
  { place_id: 'mum_bandra', name: 'Bandra Linking Road', display_name: 'Bandra West, Mumbai, Maharashtra, 400050, India', lat: 19.0596, lon: 72.8295, type: 'commercial' },
  { place_id: 'mum_marine', name: 'Marine Drive / Nariman Point', display_name: 'Marine Drive, Churchgate, Mumbai, Maharashtra, 400020, India', lat: 18.9438, lon: 72.8232, type: 'street' },
  { place_id: 'mum_andheri', name: 'Andheri East Commercial Hub', display_name: 'Andheri East, Mumbai, Maharashtra, 400069, India', lat: 19.1136, lon: 72.8697, type: 'commercial' },
  { place_id: 'pune_kp', name: 'Koregaon Park Pune', display_name: 'Koregaon Park, Pune, Maharashtra, 411001, India', lat: 18.5362, lon: 73.8940, type: 'commercial' },

  // Bengaluru & Karnataka
  { place_id: 'blr_mg', name: 'MG Road Bengaluru', display_name: 'Mahatma Gandhi Road, Bengaluru, Karnataka, 560001, India', lat: 12.9756, lon: 77.6066, type: 'street' },
  { place_id: 'blr_indiranagar', name: 'Indiranagar 100ft Road', display_name: 'Indiranagar, Bengaluru, Karnataka, 560038, India', lat: 12.9784, lon: 77.6408, type: 'commercial' },
  { place_id: 'blr_koramangala', name: 'Koramangala 5th Block', display_name: 'Koramangala, Bengaluru, Karnataka, 560095, India', lat: 12.9352, lon: 77.6245, type: 'commercial' },

  // Other Major Cities in India
  { place_id: 'hyd_hitec', name: 'HITEC City Hyderabad', display_name: 'Madhapur, HITEC City, Hyderabad, Telangana, 500081, India', lat: 17.4474, lon: 78.3762, type: 'commercial' },
  { place_id: 'jpr_hawa', name: 'Hawa Mahal / Pink City Jaipur', display_name: 'Badi Choupad, J.D.A. Market, Pink City, Jaipur, Rajasthan, 302002, India', lat: 26.9239, lon: 75.8267, type: 'monument' },
  { place_id: 'kol_park', name: 'Park Street Kolkata', display_name: 'Mother Teresa Sarani, Park Street area, Kolkata, West Bengal, 700016, India', lat: 22.5516, lon: 88.3524, type: 'street' },
  { place_id: 'chn_tnagar', name: 'T Nagar Commercial Hub Chennai', display_name: 'Thyagaraya Nagar, Chennai, Tamil Nadu, 600017, India', lat: 13.0418, lon: 80.2341, type: 'commercial' },
  { place_id: 'lko_hazrat', name: 'Hazratganj Market Lucknow', display_name: 'Hazratganj, Lucknow, Uttar Pradesh, 226001, India', lat: 26.8524, lon: 80.9427, type: 'commercial' },
  { place_id: 'chd_sec17', name: 'Sector 17 Plaza Chandigarh', display_name: 'Sector 17, Chandigarh, 160017, India', lat: 30.7398, lon: 76.7827, type: 'commercial' },
];

/**
 * Geocode / Search places across all of India using OpenStreetMap Nominatim,
 * supported by instant matching for major Indian hubs.
 */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // Instant local match across Indian landmarks
  const localMatches = POPULAR_INDIA_LANDMARKS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.display_name.toLowerCase().includes(q)
  );

  try {
    // Search ALL places in India without restrictive viewbox
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&countrycodes=in&limit=10&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

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

    // Remote matches for the user's specific query take TOP PRIORITY!
    const combined: SearchLocationResult[] = [...remoteMatches];
    localMatches.forEach((loc) => {
      const isDuplicate = combined.some(
        (c) => Math.abs(c.lat - loc.lat) < 0.003 && Math.abs(c.lon - loc.lon) < 0.003
      );
      if (!isDuplicate) combined.push(loc);
    });

    return combined.slice(0, 10);
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
