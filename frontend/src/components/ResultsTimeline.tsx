import {
  Clock,
  Route,
  Timer,
  CheckCircle2,
  TrendingDown,
  Download,
  Share2,
} from 'lucide-react';
import { RouteOptimizeResponse } from '../types';

interface ResultsTimelineProps {
  result: RouteOptimizeResponse;
  onExportCSV: () => void;
  onShareSummary: () => void;
}

export const ResultsTimeline: React.FC<ResultsTimelineProps> = ({
  result,
  onExportCSV,
  onShareSummary,
}) => {
  return (
    <div className="space-y-4">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium mb-1">
            <Route className="w-3.5 h-3.5 text-sky-500" />
            <span>Total Distance</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {result.total_distance_km} <span className="text-xs font-normal text-slate-500">km</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium mb-1">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Total ETA Time</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {result.total_time_minutes} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
            <span>Stops Visited</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {result.ordered_stops.length - 2}{' '}
            <span className="text-xs font-normal text-slate-500">+ depot</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium mb-1">
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            <span>Compute Latency</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {result.compute_time_ms} <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
        </div>
      </div>

      {/* "Why This Route?" Explanation Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Why this route is optimal
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={onExportCSV}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              title="Download delivery sheet CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={onShareSummary}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-700/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              title="Copy shareable summary"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p>
            • <b>2-Opt Local Search:</b> Untangled path crossings, delivering a{' '}
            <span className="text-emerald-400 font-bold">
              {result.two_opt_improvement_pct}% distance reduction
            </span>{' '}
            over greedy Nearest Neighbour with {result.two_opt_swaps} edge swaps.
          </p>
          <p>
            • <b>{result.algorithm_used} Shortest Path:</b> Verified minimum-cost paths across all
            intersections.
          </p>
          <p>
            • <b>ML Weights:</b>{' '}
            {result.ml_applied ? (
              <span className="text-purple-300 font-semibold">
                Active — travel times calculated via Random Forest accounting for traffic & rain.
              </span>
            ) : (
              <span className="text-slate-400">
                Disabled — routing purely on physical distance.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stop-by-Stop Chronological Timeline */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Delivery Itinerary & ETA Timeline
        </h3>

        <div className="relative pl-6 space-y-3 border-l-2 border-slate-200 ml-2">
          {result.ordered_stops.map((stop, i) => {
            const leg = i > 0 ? result.legs[i - 1] : null;

            return (
              <div key={`${stop.id}-${i}`} className="relative group">
                {/* Node icon / dot */}
                <div
                  className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    stop.is_depot
                      ? 'bg-slate-900 border-sky-400 text-sky-400'
                      : 'bg-sky-500 border-white text-white shadow-2xs'
                  }`}
                >
                  {stop.is_depot ? 'H' : i}
                </div>

                {/* Content */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-900 flex items-center">
                      <span>{stop.name}</span>
                      {stop.is_depot && (
                        <span className="ml-1.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                          {i === 0 ? 'Start' : 'Finish'}
                        </span>
                      )}
                    </div>
                    {leg && (
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Leg: {leg.distance_km} km • {leg.duration_minutes} min drive
                      </div>
                    )}
                  </div>

                  {/* ETA Clock Time */}
                  <div className="text-right shrink-0">
                    <span className="inline-block font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      ETA {stop.eta}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
