import { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayerGroup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  Crosshair,
  Plus,
  Minus,
  MapPin,
  Building2,
  Navigation,
} from 'lucide-react';
import { StopInput, RouteOptimizeResponse } from '../../types';
import { LocationSearchBar } from './LocationSearchBar';

interface DeliveryMapProps {
  depot: { lat: number; lon: number };
  stops: StopInput[];
  routeResult: RouteOptimizeResponse | null;
  onMapClick: (lat: number, lon: number) => void;
  mapClickMode: 'add_stop' | 'set_depot';
  setMapClickMode: (mode: 'add_stop' | 'set_depot') => void;
  onAddStop: (name: string, lat: number, lon: number) => void;
  onSetDepot: (lat: number, lon: number) => void;
}

const TILE_SERVERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    name: 'Streets',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
    name: 'Satellite',
  },
};

const VIBRANT_LEG_COLORS = [
  '#0284c7', // Sky Blue
  '#10b981', // Emerald Green
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
  const timeLabel = etaStr ? ` • ${etaStr}` : '';
  return L.divIcon({
    className: 'custom-depot-pin',
    html: `
      <div style="display: inline-flex; align-items: center; gap: 6px; background: #0f172a; border: 2.5px solid #38bdf8; border-radius: 9999px; padding: 4px 10px; color: #38bdf8; font-weight: 700; font-size: 11px; box-shadow: 0 4px 14px rgba(0,0,0,0.5); white-space: nowrap; cursor: pointer;">
        <span style="font-size: 13px;">🏢</span>
        <span style="color: #ffffff;">Warehouse Hub${timeLabel}</span>
      </div>
    `,
    iconSize: [140, 32],
    iconAnchor: [70, 16],
  });
}

function createStopIcon(
  index: number,
  name: string,
  etaStr?: string,
  distStr?: string,
  isOptimized?: boolean
) {
  const bg = isOptimized ? '#0284c7' : '#64748b';
  const cleanName = name.split('-')[0].trim();
  const subLabel = etaStr
    ? `${etaStr}${distStr ? ` (+${distStr})` : ''}`
    : distStr
    ? `+${distStr}`
    : '';

  return L.divIcon({
    className: 'custom-stop-pin',
    html: `
      <div style="display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 2px solid ${bg}; border-radius: 9999px; padding: 3px 8px 3px 4px; box-shadow: 0 3px 12px rgba(0,0,0,0.3); white-space: nowrap; cursor: pointer;">
        <span style="width: 20px; height: 20px; border-radius: 50%; background: ${bg}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">
          ${index}
        </span>
        <div style="display: flex; flex-direction: column; line-height: 1.15; padding-right: 2px;">
          <span style="font-weight: 700; font-size: 11px; color: #0f172a;">${cleanName}</span>
          ${
            subLabel
              ? `<span style="font-weight: 600; font-size: 9.5px; color: #0284c7;">${subLabel}</span>`
              : ''
          }
        </div>
      </div>
    `,
    iconSize: [160, 32],
    iconAnchor: [20, 16],
  });
}

function createMidLegBadgeIcon(
  legNumber: number,
  distKm: number,
  durationMin: number,
  color: string
) {
  return L.divIcon({
    className: 'custom-leg-badge',
    html: `
      <div style="display: inline-flex; align-items: center; gap: 4px; background: #0f172a; color: #ffffff; padding: 3px 9px; border-radius: 9999px; font-size: 10px; font-weight: 700; box-shadow: 0 3px 10px rgba(0,0,0,0.4); border: 2px solid ${color}; white-space: nowrap; pointer-events: none;">
        <span style="color: ${color};">Leg ${legNumber}</span>
        <span style="color: #94a3b8;">•</span>
        <span style="color: #f8fafc;">${distKm} km</span>
        <span style="color: #94a3b8;">(${durationMin}m)</span>
        <span style="color: ${color}; font-size: 11px;">➔</span>
      </div>
    `,
    iconSize: [130, 22],
    iconAnchor: [65, 11],
  });
}

// Map Event and Controller Helper
function MapEventHandler({
  onMapClick,
  mapRef,
}: {
  onMapClick: (lat: number, lon: number) => void;
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Auto-fit bounds ONLY on initial load or when a new route is optimized
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
  const prevResultRef = useRef<RouteOptimizeResponse | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Only fit bounds on first load or when routeResult is newly generated
    const isNewRoute = routeResult && routeResult !== prevResultRef.current;
    const isFirstRun = !hasInitializedRef.current && stops.length > 0;

    if (!isFirstRun && !isNewRoute) return;

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
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }

    hasInitializedRef.current = true;
    prevResultRef.current = routeResult;
  }, [depot, stops, routeResult, map]);

  return null;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  depot,
  stops,
  routeResult,
  onMapClick,
  mapClickMode,
  setMapClickMode,
  onAddStop,
  onSetDepot,
}) => {
  const [tileMode, setTileMode] = useState<'streets' | 'satellite'>('streets');
  const mapInstanceRef = useRef<L.Map | null>(null);

  const depotETA = routeResult?.ordered_stops[0]?.eta;
  const depotIcon = useMemo(() => createDepotIcon(depotETA), [depotETA]);

  // Pre-calculate stop visit indices, ETAs, and leg distances for badges
  const stopMetaMap = useMemo(() => {
    const map = new Map<
      string,
      { visitIndex: number; eta: string; distFromPrev: string }
    >();
    if (routeResult) {
      routeResult.ordered_stops.forEach((st, idx) => {
        if (!st.is_depot) {
          const prevLeg = routeResult.legs[idx - 1];
          const distStr = prevLeg ? `${prevLeg.distance_km} km` : '';
          map.set(st.id, {
            visitIndex: st.visit_index,
            eta: st.eta,
            distFromPrev: distStr,
          });
        }
      });
    }
    return map;
  }, [routeResult]);

  const handleFlyTo = (lat: number, lon: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 15, {
        duration: 1.2,
      });
    }
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
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
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const currentTile = TILE_SERVERS[tileMode];

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden select-none">
      {/* 1. Top Floating Bar: Location Search + Click Mode Controls */}
      <div
        className="absolute top-3 left-3 right-3 sm:right-auto sm:left-4 z-[1000] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Geocoding Location Search Bar */}
        <LocationSearchBar
          onAddStop={onAddStop}
          onSetDepot={onSetDepot}
          onFlyTo={handleFlyTo}
        />

        {/* Map Click Action Mode Switcher */}
        <div className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setMapClickMode('add_stop')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              mapClickMode === 'add_stop'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Click to Add Stop</span>
          </button>

          <button
            type="button"
            onClick={() => setMapClickMode('set_depot')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              mapClickMode === 'set_depot'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Set Depot</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Right Floating Tool Controls (Layer Toggle + Fit Route + Zoom) */}
      <div
        className="absolute top-3 right-3 z-[1000] flex flex-col space-y-2"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Satellite vs Street Map Switcher */}
        <div className="flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setTileMode('streets')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
              tileMode === 'streets'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
            title="Standard street map with road labels"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Streets</span>
          </button>

          <button
            type="button"
            onClick={() => setTileMode('satellite')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
              tileMode === 'satellite'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
            title="Real high-resolution satellite imagery"
          >
            <span className="text-xs">🛰️</span>
            <span className="hidden sm:inline">Satellite</span>
          </button>
        </div>

        {/* Center / Fit Route Button */}
        <button
          type="button"
          onClick={handleFitAll}
          className="flex items-center justify-center p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
          title="Recenter map to fit all stops & routes"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-700 dark:text-slate-200 hover:text-sky-600 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-700 dark:text-slate-200 hover:text-sky-600 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Bottom Banner: Active Stats Badge */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-slate-700 shadow-xl text-xs flex items-center space-x-3 pointer-events-none">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">
            {stops.length} Stops Active
          </span>
        </div>
        {routeResult && (
          <>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1 text-sky-400 font-bold">
              <Navigation className="w-3.5 h-3.5" />
              <span>{routeResult.total_distance_km} km total</span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">
              ETA: {routeResult.total_time_minutes} mins
            </span>
          </>
        )}
      </div>

      {/* 4. Leaflet Map Container */}
      <MapContainer
        center={[depot.lat, depot.lon]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          key={tileMode}
          attribution={currentTile.attribution}
          url={currentTile.url}
          maxZoom={currentTile.maxZoom}
        />

        <MapEventHandler onMapClick={onMapClick} mapRef={mapInstanceRef} />
        <AutoFitBounds depot={depot} stops={stops} routeResult={routeResult} />

        {/* Depot Marker */}
        <Marker position={[depot.lat, depot.lon]} icon={depotIcon}>
          <Popup>
            <div className="text-xs p-1 space-y-1">
              <div className="font-extrabold text-slate-900 flex items-center space-x-1">
                <span>🏢 Central Delivery Depot / Hub</span>
              </div>
              <div className="text-slate-600">Start & Final Return Point</div>
              <div className="text-slate-500 font-mono text-[11px]">
                {depot.lat.toFixed(4)}, {depot.lon.toFixed(4)}
              </div>
              {depotETA && (
                <div className="font-bold text-sky-700 bg-sky-50 p-1.5 rounded-lg border border-sky-100">
                  Departure: {depotETA}
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Customer Stop Markers */}
        {stops.map((stop, idx) => {
          const meta = stopMetaMap.get(stop.id);
          const visitIdx = meta?.visitIndex ?? idx + 1;
          const etaStr = meta?.eta;
          const distStr = meta?.distFromPrev;
          const stopIcon = createStopIcon(
            visitIdx,
            stop.name,
            etaStr,
            distStr,
            Boolean(routeResult)
          );

          return (
            <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={stopIcon}>
              <Popup>
                <div className="text-xs p-1 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {visitIdx}
                    </span>
                    <span>{stop.name}</span>
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                  </div>
                  {routeResult && etaStr && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 space-y-0.5">
                      <div className="font-bold text-emerald-800">
                        Stop #{visitIdx} in Optimal Sequence
                      </div>
                      <div className="text-emerald-700">
                        Expected Arrival: <b>{etaStr}</b>
                      </div>
                      {distStr && (
                        <div className="text-emerald-700 text-[11px]">
                          Leg Distance: <b>{distStr}</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* High-Visibility Dual-Layer Route Polylines */}
        {routeResult &&
          routeResult.legs.map((leg, i) => {
            const color = VIBRANT_LEG_COLORS[i % VIBRANT_LEG_COLORS.length];
            const coords = leg.polyline_coords;

            // Pick midpoint coordinate along the road curve for clean floating badge
            const midCoord =
              coords.length > 2 ? coords[Math.floor(coords.length / 2)] : null;
            const badgeIcon = midCoord
              ? createMidLegBadgeIcon(
                  i + 1,
                  leg.distance_km,
                  leg.duration_minutes,
                  color
                )
              : null;

            return (
              <LayerGroup key={`leg-polyline-group-${i}`}>
                {/* 1. Outer Dark Casing Polyline for High Contrast */}
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 8,
                    opacity: 0.75,
                    lineJoin: 'round',
                    lineCap: 'round',
                  }}
                />

                {/* 2. Inner Vibrant Core Road Polyline */}
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color,
                    weight: 5,
                    opacity: 0.95,
                    lineJoin: 'round',
                    lineCap: 'round',
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-1.5">
                      <strong className="text-slate-900 block font-bold text-sm">
                        Leg #{i + 1}: {leg.from_name} ➔ {leg.to_name}
                      </strong>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div>
                          <div className="text-slate-500 text-[10px]">DISTANCE</div>
                          <div className="font-bold text-slate-800 text-sm">
                            {leg.distance_km} km
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[10px]">DRIVE TIME</div>
                          <div className="font-bold text-slate-800 text-sm">
                            {leg.duration_minutes} mins
                          </div>
                        </div>
                      </div>
                      <div className="text-emerald-700 font-semibold bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                        Arrival Time: <b>{leg.arrival_time}</b>
                      </div>
                    </div>
                  </Popup>
                </Polyline>

                {/* 3. Floating Mid-Leg Badge along road */}
                {midCoord && badgeIcon && (
                  <Marker position={midCoord} icon={badgeIcon} interactive={false} />
                )}
              </LayerGroup>
            );
          })}
      </MapContainer>
    </div>
  );
};
