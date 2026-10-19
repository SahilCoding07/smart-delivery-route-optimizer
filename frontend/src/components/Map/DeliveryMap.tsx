import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { StopInput, RouteOptimizeResponse } from '../../types';

interface DeliveryMapProps {
  depot: { lat: number; lon: number };
  stops: StopInput[];
  routeResult: RouteOptimizeResponse | null;
  onMapClick: (lat: number, lon: number) => void;
  mapClickMode: 'add_stop' | 'set_depot';
}

const LEG_COLORS = [
  '#0284c7', // Sky
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#84cc16', // Lime
];

function createDepotIcon(etaStr?: string) {
  const label = etaStr ? `Depot • ${etaStr}` : 'Warehouse Hub';
  return L.divIcon({
    className: 'custom-depot-pin',
    html: `
      <div style="display: flex; align-items: center; gap: 6px; background: #0f172a; border: 2.5px solid #38bdf8; border-radius: 999px; padding: 4px 10px; color: #38bdf8; font-weight: bold; font-size: 11px; box-shadow: 0 4px 14px rgba(0,0,0,0.4); white-space: nowrap;">
        <span>🏢</span>
        <span style="color: white;">${label}</span>
      </div>
    `,
    iconSize: [120, 32],
    iconAnchor: [60, 16],
  });
}

function createStopIcon(index: number, name: string, etaStr?: string, isOptimized?: boolean) {
  const bg = isOptimized ? '#0284c7' : '#64748b';
  const label = etaStr ? `${name.split('-')[0].trim()} • ${etaStr}` : name.split('-')[0].trim();

  return L.divIcon({
    className: 'custom-stop-pin',
    html: `
      <div style="display: flex; align-items: center; gap: 5px; background: white; border: 2px solid ${bg}; border-radius: 999px; padding: 3px 8px 3px 4px; box-shadow: 0 3px 10px rgba(0,0,0,0.25); white-space: nowrap;">
        <span style="width: 20px; height: 20px; border-radius: 50%; background: ${bg}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px;">
          ${index}
        </span>
        <span style="font-weight: 600; font-size: 11px; color: #0f172a;">
          ${label}
        </span>
      </div>
    `,
    iconSize: [140, 28],
    iconAnchor: [20, 14],
  });
}

function createMidLegBadgeIcon(legNumber: number, distKm: number, durationMin: number, color: string) {
  return L.divIcon({
    className: 'custom-leg-badge',
    html: `
      <div style="background: ${color}; color: white; padding: 2px 7px; border-radius: 999px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1.5px solid white; white-space: nowrap;">
        Leg ${legNumber}: ${distKm} km (${durationMin}m)
      </div>
    `,
    iconSize: [110, 20],
    iconAnchor: [55, 10],
  });
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function AutoFitBounds({
  depot,
  stops,
  routeResult,
}: {
  depot: { lat: number; lon: number };
  stops: StopInput[];
  routeResult: RouteOptimizeResponse | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[depot.lat, depot.lon]];

    if (routeResult && routeResult.legs.length > 0) {
      routeResult.legs.forEach((leg) => {
        leg.polyline_coords.forEach((coord) => points.push(coord));
      });
    } else {
      stops.forEach((s) => points.push([s.lat, s.lon]));
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [depot, stops, routeResult, map]);

  return null;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  depot,
  stops,
  routeResult,
  onMapClick,
  mapClickMode,
}) => {
  const depotETA = routeResult?.ordered_stops[0]?.eta;
  const depotIcon = useMemo(() => createDepotIcon(depotETA), [depotETA]);

  const stopMetaMap = useMemo(() => {
    const map = new Map<string, { visitIndex: number; eta: string }>();
    if (routeResult) {
      routeResult.ordered_stops.forEach((st) => {
        if (!st.is_depot) {
          map.set(st.id, { visitIndex: st.visit_index, eta: st.eta });
        }
      });
    }
    return map;
  }, [routeResult]);

  return (
    <div className="relative w-full h-full">
      {/* Floating Instructions Banner */}
      <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200 text-xs text-slate-700 flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          Mode:{' '}
          <strong className="text-slate-900">
            {mapClickMode === 'set_depot' ? 'Click map to place Depot' : 'Click map to add a Customer Stop'}
          </strong>
        </span>
      </div>

      <MapContainer
        center={[depot.lat, depot.lon]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={onMapClick} />
        <AutoFitBounds depot={depot} stops={stops} routeResult={routeResult} />

        {/* Depot Marker */}
        <Marker position={[depot.lat, depot.lon]} icon={depotIcon}>
          <Popup>
            <div className="text-xs">
              <strong className="text-slate-900 block font-bold">🏢 Warehouse Depot</strong>
              <span className="text-slate-600">Start Time: {depotETA || '14:30'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Customer Stop Markers with ETA Badges */}
        {stops.map((stop, idx) => {
          const meta = stopMetaMap.get(stop.id);
          const visitIdx = meta?.visitIndex ?? idx + 1;
          const etaStr = meta?.eta;
          const stopIcon = createStopIcon(visitIdx, stop.name, etaStr, Boolean(routeResult));

          return (
            <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={stopIcon}>
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900">{stop.name}</div>
                  <div className="text-slate-500 font-mono">
                    {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                  </div>
                  {routeResult && etaStr && (
                    <div className="font-bold text-emerald-600">
                      Visit #{visitIdx} • Estimated Arrival: {etaStr}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polylines and Mid-Leg Distance Badges */}
        {routeResult &&
          routeResult.legs.map((leg, i) => {
            const color = LEG_COLORS[i % LEG_COLORS.length];
            const coords = leg.polyline_coords;

            // Pick midpoint coordinate for floating distance/timing badge
            const midCoord = coords.length > 2 ? coords[Math.floor(coords.length / 2)] : null;
            const badgeIcon = midCoord
              ? createMidLegBadgeIcon(i + 1, leg.distance_km, leg.duration_minutes, color)
              : null;

            return (
              <div key={`leg-container-${i}`}>
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color,
                    weight: 6,
                    opacity: 0.9,
                    lineJoin: 'round',
                    lineCap: 'round',
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <strong className="text-slate-900 block font-bold">
                        Leg #{i + 1}: {leg.from_name} &rarr; {leg.to_name}
                      </strong>
                      <div className="text-slate-700">Distance: <b>{leg.distance_km} km</b></div>
                      <div className="text-slate-700">Est. Time: <b>{leg.duration_minutes} minutes</b></div>
                      <div className="text-emerald-700 font-semibold">Arrival at stop: <b>{leg.arrival_time}</b></div>
                    </div>
                  </Popup>
                </Polyline>

                {/* Floating midpoint badge showing distance and time on the road */}
                {midCoord && badgeIcon && (
                  <Marker position={midCoord} icon={badgeIcon} interactive={false} />
                )}
              </div>
            );
          })}
      </MapContainer>
    </div>
  );
};
