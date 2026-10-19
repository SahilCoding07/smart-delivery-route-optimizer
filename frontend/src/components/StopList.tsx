import { Trash2, MapPin, Building2, Plus, Sparkles } from 'lucide-react';
import { StopInput } from '../types';

interface StopListProps {
  depot: { lat: number; lon: number };
  stops: StopInput[];
  onRemoveStop: (id: string) => void;
  onAddSampleStop: () => void;
  onLoadDemoData: () => void;
  onClearAll: () => void;
}

export const StopList: React.FC<StopListProps> = ({
  depot,
  stops,
  onRemoveStop,
  onAddSampleStop,
  onLoadDemoData,
  onClearAll,
}) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Delivery Stops ({stops.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">Click map or load demo</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={onLoadDemoData}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors shadow-2xs"
            title="Load 8 sample commercial stops in Central Delhi"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo (8)</span>
          </button>

          {stops.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Depot Card */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 text-white">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-md bg-sky-500 text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center">
              <span>Depot / Hub</span>
              <span className="ml-1.5 text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.2 rounded">
                Start & End
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {depot.lat.toFixed(4)}, {depot.lon.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Stops Scrollable List */}
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
        {stops.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
            <MapPin className="w-6 h-6 mx-auto mb-1 text-slate-300" />
            No delivery stops added yet.<br />
            Click on the map or click <b>"Load Demo (8)"</b>.
          </div>
        ) : (
          stops.map((stop, index) => (
            <div
              key={stop.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-150 hover:bg-white hover:border-slate-300 transition-all text-xs"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  {index + 1}
                </span>
                <div className="truncate">
                  <div className="font-semibold text-slate-800 truncate">{stop.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemoveStop(stop.id)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors ml-2"
                title="Remove stop"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Manual Quick Add Button */}
      {stops.length < 30 && (
        <button
          type="button"
          onClick={onAddSampleStop}
          className="w-full flex items-center justify-center space-x-1 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Random Stop</span>
        </button>
      )}
    </div>
  );
};
