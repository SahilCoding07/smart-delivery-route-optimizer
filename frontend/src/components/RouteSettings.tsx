import { useState } from 'react';
import { Sun, CloudRain, Clock, BrainCircuit, Navigation, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface RouteSettingsProps {
  departureTime: string;
  setDepartureTime: (time: string) => void;
  weather: 'clear' | 'rain';
  setWeather: (weather: 'clear' | 'rain') => void;
  algorithm: 'astar' | 'dijkstra';
  setAlgorithm: (algo: 'astar' | 'dijkstra') => void;
  useML: boolean;
  setUseML: (val: boolean) => void;
}

export const RouteSettings: React.FC<RouteSettingsProps> = ({
  departureTime,
  setDepartureTime,
  weather,
  setWeather,
  algorithm,
  setAlgorithm,
  useML,
  setUseML,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
          <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
          <span>Trip Conditions</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">Traffic & Weather</span>
      </div>

      {/* Row 1: Departure Time & Weather */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Departure Time
          </label>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full text-sm font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50 text-slate-800"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
            Weather
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setWeather('clear')}
              className={`flex items-center justify-center space-x-1 py-1 rounded-md text-xs font-semibold transition-all ${
                weather === 'clear'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={() => setWeather('rain')}
              className={`flex items-center justify-center space-x-1 py-1 rounded-md text-xs font-semibold transition-all ${
                weather === 'rain'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Rain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Algorithm / ML Accordion Toggle */}
      <div className="pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
        >
          <span className="flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Algorithm & AI Engine: <strong className="text-sky-600">{algorithm.toUpperCase()}</strong> + <strong className="text-purple-600">{useML ? 'AI Weights' : 'Static'}</strong></span>
          </span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 pt-2 border-t border-dashed border-slate-200">
            {/* Algorithm Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
                <Navigation className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Shortest-Path Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAlgorithm('astar')}
                  className={`border rounded-lg p-2 text-left transition-all ${
                    algorithm === 'astar'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900">A* Search (Guided)</div>
                  <div className="text-[10px] text-slate-500">Prunes ~72% nodes via Haversine</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAlgorithm('dijkstra')}
                  className={`border rounded-lg p-2 text-left transition-all ${
                    algorithm === 'dijkstra'
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900">Dijkstra</div>
                  <div className="text-[10px] text-slate-500">Uniform radial exploration</div>
                </button>
              </div>
            </div>

            {/* ML Travel Times Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-md bg-purple-100 text-purple-700">
                  <BrainCircuit className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">ML Edge Weights</div>
                  <div className="text-[10px] text-slate-500">
                    Random Forest predicts travel time dynamically
                  </div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useML}
                  onChange={(e) => setUseML(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
