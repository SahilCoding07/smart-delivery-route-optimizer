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

// Distinct vibrant palette for route legs
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

function createDepotIcon() {
  return L.divIcon({
    className: 'custom-depot-pin',
    html: `<div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #0f172a; border: 2.5px solid #38bdf8; border-radius: 50%; color: #38bdf8; font-weight: bold; font-size: 13px;">🏢</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createStopIcon(index: number, isOptimized: boolean) {
  const bg = isOptimized ? '#0284c7' : '#64748b';
  return L.divIcon({
    className: 'custom-stop-pin',
    html: `<div style="width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: ${bg}; border: 2px solid white; border-radius: 50%; color: white; font-weight: 700; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${index}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Component to handle map clicks
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

// Automatically fit bounds when route or stops update
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
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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
  const depotIcon = useMemo(() => createDepotIcon(), []);

  // Map visit indices if optimized
  const stopVisitIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    if (routeResult) {
      routeResult.ordered_stops.forEach((st) => {
        if (!st.is_depot) {
          map.set(st.id, st.visit_index);
        }
      });
    }
    return map;
  }, [routeResult]);

  return (
    <div className="relative w-full h-full">
      {/* Floating Click Mode Indicator */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-medium text-slate-700 flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
        <span>
          Click Map to:{' '}
          <strong className="text-sky-700">
            {mapClickMode === 'set_depot' ? 'Set Depot Location' : 'Add Delivery Stop'}
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={onMapClick} />
        <AutoFitBounds depot={depot} stops={stops} routeResult={routeResult} />

        {/* Depot Marker */}
        <Marker position={[depot.lat, depot.lon]} icon={depotIcon}>
          <Popup>
            <div className="text-xs">
              <strong className="text-slate-900 block font-bold">Depot / Warehouse</strong>
              <span className="text-slate-500">Trip start and completion base</span>
            </div>
          </Popup>
        </Marker>

        {/* Delivery Stop Markers */}
        {stops.map((stop, idx) => {
          const visitIdx = stopVisitIndexMap.get(stop.id) ?? idx + 1;
          const stopIcon = createStopIcon(visitIdx, Boolean(routeResult));

          return (
            <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={stopIcon}>
              <Popup>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">{stop.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">
                    {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                  </div>
                  {routeResult && (
                    <div className="mt-1 font-semibold text-sky-700">
                      Visit Sequence #{visitIdx}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polylines */}
        {routeResult &&
          routeResult.legs.map((leg, i) => {
            const color = LEG_COLORS[i % LEG_COLORS.length];
            return (
              <Polyline
                key={`leg-${leg.from_stop_id}-${leg.to_stop_id}-${i}`}
                positions={leg.polyline_coords}
                pathOptions={{
                  color,
                  weight: 5,
                  opacity: 0.85,
                  lineJoin: 'round',
                  lineCap: 'round',
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <strong className="text-slate-900 block font-bold">
                      Leg #{i + 1}: {leg.from_name} &rarr; {leg.to_name}
                    </strong>
                    <div>Distance: {leg.distance_km} km</div>
                    <div>Est. Time: {leg.duration_minutes} min</div>
                    <div>Arrival: {leg.arrival_time}</div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}
      </MapContainer>
    </div>
  );
};
