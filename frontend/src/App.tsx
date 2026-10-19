import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DeliveryMap } from './components/Map/DeliveryMap';
import { InsightsTab } from './components/tabs/InsightsTab';
import { AlgorithmsTab } from './components/tabs/AlgorithmsTab';
import { AboutTab } from './components/tabs/AboutTab';
import {
  StopInput,
  RouteOptimizeResponse,
  GraphInfo,
} from './types';
import { fetchHealth, fetchGraphInfo, optimizeRoute } from './services/api';

// Curated 8 demo delivery stops in Dehradun (Clement Town, Graphic Era, Mohbbewala, etc.)
const DEMO_DEPOT = { lat: 30.2720, lon: 78.0060 }; // Warehouse Hub - Clement Town / ISBT Road

const DEMO_STOPS: StopInput[] = [
  { id: 'stop_1', name: 'Graphic Era University - Bell Road', lat: 30.2704, lon: 77.9949 },
  { id: 'stop_2', name: 'Buddha Temple - Mindrolling Monastery', lat: 30.2606, lon: 78.0097 },
  { id: 'stop_3', name: 'Subhash Nagar Market', lat: 30.2760, lon: 78.0020 },
  { id: 'stop_4', name: 'Mohbbewala Industrial Hub', lat: 30.2520, lon: 77.9890 },
  { id: 'stop_5', name: 'ISBT Dehradun Commercial Terminal', lat: 30.2858, lon: 78.0080 },
  { id: 'stop_6', name: 'Graphic Era Hill University Campus', lat: 30.2745, lon: 77.9912 },
  { id: 'stop_7', name: 'Turner Road Commercial Center', lat: 30.2785, lon: 78.0035 },
  { id: 'stop_8', name: 'Majra Main Market', lat: 30.2890, lon: 78.0120 },
];

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'algorithms' | 'about'>('dashboard');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [graphInfo, setGraphInfo] = useState<GraphInfo | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('routewise_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('routewise_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('routewise_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Route Planning State
  const [depot, setDepot] = useState(DEMO_DEPOT);
  const [stops, setStops] = useState<StopInput[]>(DEMO_STOPS);
  const [departureTime, setDepartureTime] = useState('14:30');
  const [weather, setWeather] = useState<'clear' | 'rain'>('clear');
  const [algorithm, setAlgorithm] = useState<'astar' | 'dijkstra'>('astar');
  const [useML, setUseML] = useState(true);

  // Interaction & Execution State
  const [mapClickMode, setMapClickMode] = useState<'add_stop' | 'set_depot'>('add_stop');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RouteOptimizeResponse | null>(null);

  // Initial check on backend health and graph info
  useEffect(() => {
    async function checkBackend() {
      try {
        await fetchHealth();
        setIsBackendConnected(true);
        const info = await fetchGraphInfo();
        setGraphInfo(info);
      } catch (e) {
        console.warn('Backend not responding yet:', e);
        setIsBackendConnected(false);
      }
    }
    checkBackend();
  }, []);

  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    setRouteResult(null);
  };

  const handleClearAll = () => {
    setStops([]);
    setRouteResult(null);
    setErrorMessage(null);
  };

  const handleLoadDemoData = () => {
    setDepot(DEMO_DEPOT);
    setStops(DEMO_STOPS);
    setRouteResult(null);
    setErrorMessage(null);
  };

  const handleAddSampleStop = () => {
    if (stops.length >= 30) return;
    const randomOffsetLat = (Math.random() - 0.5) * 0.05;
    const randomOffsetLon = (Math.random() - 0.5) * 0.05;
    const newStop: StopInput = {
      id: `custom_stop_${Date.now()}`,
      name: `Delivery Stop #${stops.length + 1}`,
      lat: Number((depot.lat + randomOffsetLat).toFixed(4)),
      lon: Number((depot.lon + randomOffsetLon).toFixed(4)),
    };
    setStops((prev) => [...prev, newStop]);
    setRouteResult(null);
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (mapClickMode === 'set_depot') {
      setDepot({ lat, lon });
      setRouteResult(null);
    } else {
      if (stops.length >= 30) {
        setErrorMessage('Maximum limit of 30 stops reached.');
        return;
      }
      const newStop: StopInput = {
        id: `stop_${Date.now()}`,
        name: `Customer Point #${stops.length + 1}`,
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
      };
      setStops((prev) => [...prev, newStop]);
      setRouteResult(null);
      setErrorMessage(null);
    }
  };

  const handleAddStopFromSearch = (name: string, lat: number, lon: number) => {
    if (stops.length >= 30) {
      setErrorMessage('Maximum limit of 30 stops reached.');
      return;
    }
    const newStop: StopInput = {
      id: `stop_${Date.now()}`,
      name,
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
    };
    setStops((prev) => [...prev, newStop]);
    setRouteResult(null);
    setErrorMessage(null);
  };

  const handleSetDepotFromSearch = (lat: number, lon: number) => {
    setDepot({ lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) });
    setRouteResult(null);
    setErrorMessage(null);
  };

  const handleOptimize = async () => {
    if (stops.length === 0) return;
    setIsOptimizing(true);
    setErrorMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const isoDeparture = `${today}T${departureTime}:00Z`;

      const result = await optimizeRoute({
        depot,
        stops,
        departure_time: isoDeparture,
        weather,
        algorithm,
        use_ml: useML,
      });

      setRouteResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Optimization failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExportCSV = () => {
    if (!routeResult) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Visit Order,Stop Name,ETA,Latitude,Longitude,Type\n';

    routeResult.ordered_stops.forEach((s) => {
      csvContent += `${s.visit_index},"${s.name}",${s.eta},${s.lat},${s.lon},${
        s.is_depot ? 'Depot' : 'Delivery'
      }\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `routewise_manifest_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareSummary = () => {
    if (!routeResult) return;
    const summary = `🚚 RouteWise Delivery Itinerary:
Total Stops: ${routeResult.ordered_stops.length - 2}
Total Distance: ${routeResult.total_distance_km} km
Total ETA Time: ${routeResult.total_time_minutes} minutes
Algorithm: ${routeResult.algorithm_used} + 2-Opt (${routeResult.two_opt_improvement_pct}% saved)
ML Weights: ${routeResult.ml_applied ? 'Enabled' : 'Disabled'}`;

    navigator.clipboard.writeText(summary);
    alert('Route summary copied to clipboard!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cityName={graphInfo?.city_name || 'Dehradun'}
        isBackendConnected={isBackendConnected}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {activeTab === 'dashboard' && (
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left Side: Sidebar */}
          <Sidebar
            depot={depot}
            stops={stops}
            departureTime={departureTime}
            setDepartureTime={setDepartureTime}
            weather={weather}
            setWeather={setWeather}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            useML={useML}
            setUseML={setUseML}
            onRemoveStop={handleRemoveStop}
            onAddSampleStop={handleAddSampleStop}
            onLoadDemoData={handleLoadDemoData}
            onClearAll={handleClearAll}
            onOptimize={handleOptimize}
            isOptimizing={isOptimizing}
            errorMessage={errorMessage}
            routeResult={routeResult}
            mapClickMode={mapClickMode}
            setMapClickMode={setMapClickMode}
            onAddStopFromSearch={handleAddStopFromSearch}
            onExportCSV={handleExportCSV}
            onShareSummary={handleShareSummary}
          />

          {/* Right Side: Interactive Leaflet Map */}
          <div className="flex-1 h-[50vh] lg:h-[calc(100vh-61px)] relative">
            <DeliveryMap
              depot={depot}
              stops={stops}
              routeResult={routeResult}
              onMapClick={handleMapClick}
              mapClickMode={mapClickMode}
              setMapClickMode={setMapClickMode}
              onAddStop={handleAddStopFromSearch}
              onSetDepot={handleSetDepotFromSearch}
            />
          </div>
        </main>
      )}

      {activeTab === 'insights' && (
        <div className="flex-1 overflow-y-auto">
          <InsightsTab />
        </div>
      )}

      {activeTab === 'algorithms' && (
        <div className="flex-1 overflow-y-auto">
          <AlgorithmsTab />
        </div>
      )}

      {activeTab === 'about' && (
        <div className="flex-1 overflow-y-auto">
          <AboutTab />
        </div>
      )}
    </div>
  );
}
export default App;
