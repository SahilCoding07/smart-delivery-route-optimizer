import { Play, Loader2, AlertCircle, MapPin, Building2 } from 'lucide-react';
import { StopList } from './StopList';
import { RouteSettings } from './RouteSettings';
import { ResultsTimeline } from './ResultsTimeline';
import { StopInput, RouteOptimizeResponse } from '../types';

interface SidebarProps {
  depot: { lat: number; lon: number };
  stops: StopInput[];
  departureTime: string;
  setDepartureTime: (time: string) => void;
  weather: 'clear' | 'rain';
  setWeather: (w: 'clear' | 'rain') => void;
  algorithm: 'astar' | 'dijkstra';
  setAlgorithm: (a: 'astar' | 'dijkstra') => void;
  useML: boolean;
  setUseML: (val: boolean) => void;
  onRemoveStop: (id: string) => void;
  onAddSampleStop: () => void;
  onLoadDemoData: () => void;
  onClearAll: () => void;
  onOptimize: () => void;
  isOptimizing: boolean;
  errorMessage: string | null;
  routeResult: RouteOptimizeResponse | null;
  mapClickMode: 'add_stop' | 'set_depot';
  setMapClickMode: (mode: 'add_stop' | 'set_depot') => void;
  onAddStopFromSearch: (name: string, lat: number, lon: number) => void;
  onExportCSV: () => void;
  onShareSummary: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  depot,
  stops,
  departureTime,
  setDepartureTime,
  weather,
  setWeather,
  algorithm,
  setAlgorithm,
  useML,
  setUseML,
  onRemoveStop,
  onAddSampleStop,
  onLoadDemoData,
  onClearAll,
  onOptimize,
  isOptimizing,
  errorMessage,
  routeResult,
  mapClickMode,
  setMapClickMode,
  onAddStopFromSearch,
  onExportCSV,
  onShareSummary,
}) => {
  return (
    <aside className="w-full lg:w-[440px] xl:w-[480px] bg-slate-100 border-r border-slate-200 flex flex-col h-[calc(100vh-61px)] overflow-hidden shrink-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Click Mode Selector */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 ml-1">Map Click Action:</span>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMapClickMode('add_stop')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                mapClickMode === 'add_stop'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Add Stop</span>
            </button>
            <button
              type="button"
              onClick={() => setMapClickMode('set_depot')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                mapClickMode === 'set_depot'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Set Depot</span>
            </button>
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-start space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Stops Management */}
        <StopList
          depot={depot}
          stops={stops}
          onRemoveStop={onRemoveStop}
          onAddSampleStop={onAddSampleStop}
          onLoadDemoData={onLoadDemoData}
          onClearAll={onClearAll}
          onAddStopFromSearch={onAddStopFromSearch}
        />

        {/* Trip & Algorithm Settings */}
        <RouteSettings
          departureTime={departureTime}
          setDepartureTime={setDepartureTime}
          weather={weather}
          setWeather={setWeather}
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}
          useML={useML}
          setUseML={setUseML}
        />

        {/* Primary Action Button - Step 3 */}
        <button
          type="button"
          onClick={onOptimize}
          disabled={stops.length === 0 || isOptimizing}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm active:scale-[0.99]"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating Best Driving Order...</span>
            </>
          ) : (
            <>
              <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-black">3</span>
              <Play className="w-4 h-4 fill-current ml-1" />
              <span>Generate Driver Route ({stops.length} Stops)</span>
            </>
          )}
        </button>

        {/* Optimization Results & Timeline */}
        {routeResult && (
          <ResultsTimeline
            result={routeResult}
            onExportCSV={onExportCSV}
            onShareSummary={onShareSummary}
          />
        )}
      </div>
    </aside>
  );
};
