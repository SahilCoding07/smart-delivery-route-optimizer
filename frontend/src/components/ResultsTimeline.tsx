import { useState } from 'react';
import {
  Clock,
  Route,
  CheckCircle2,
  TrendingDown,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Large High-Visibility Driver Summary Cards */}
      <div className="bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
            Delivery Summary
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onExportCSV}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition-all shadow-2xs"
              title="Download CSV for driver"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={onShareSummary}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition-all shadow-2xs"
              title="Copy route text"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
            <div className="text-[11px] text-sky-200 flex items-center justify-center space-x-1">
              <Route className="w-3 h-3" />
              <span>Distance</span>
            </div>
            <div className="text-lg font-extrabold font-mono mt-0.5">
              {result.total_distance_km} <span className="text-xs font-normal">km</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
            <div className="text-[11px] text-sky-200 flex items-center justify-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Total Time</span>
            </div>
            <div className="text-lg font-extrabold font-mono mt-0.5">
              {result.total_time_minutes} <span className="text-xs font-normal">min</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
            <div className="text-[11px] text-sky-200 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Stops</span>
            </div>
            <div className="text-lg font-extrabold font-mono mt-0.5">
              {result.ordered_stops.length - 2}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step-by-Step Driver Turn-by-Turn Route Sheet */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
            <span>🚗 Driver Itinerary & Clock Arrival Times</span>
          </h3>
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Optimal Order
          </span>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {result.ordered_stops.map((stop, i) => {
            const leg = i > 0 ? result.legs[i - 1] : null;
            const isFirst = i === 0;
            const isLast = i === result.ordered_stops.length - 1;

            // Calculate cumulative distance up to this stop
            const cumulativeKm = Number(
              result.legs
                .slice(0, i)
                .reduce((acc, curr) => acc + curr.distance_km, 0)
                .toFixed(2)
            );

            return (
              <div key={`${stop.id}-${i}`} className="relative pl-6">
                {/* Vertical Connector Line */}
                {!isLast && (
                  <div className="absolute left-[11px] top-6 bottom-[-14px] w-0.5 bg-sky-200 dark:bg-sky-900 z-0" />
                )}

                {/* Step Node Dot */}
                <div
                  className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shadow-sm z-10 ${
                    stop.is_depot
                      ? 'bg-slate-900 text-sky-400 ring-2 ring-sky-400'
                      : 'bg-sky-600 text-white ring-2 ring-white dark:ring-slate-800'
                  }`}
                >
                  {stop.is_depot ? (isFirst ? '🏢' : '🏁') : i}
                </div>

                {/* Prior Leg Drive Stats Pill */}
                {leg && (
                  <div className="mb-1.5 flex items-center space-x-2 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md w-fit border border-slate-200 dark:border-slate-700">
                    <ArrowRight className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="text-sky-700 dark:text-sky-300 font-bold">
                      Drive {leg.distance_km} km
                    </span>
                    <span>•</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {leg.duration_minutes} mins
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-400 text-[10px]">
                      (Total: {cumulativeKm} km)
                    </span>
                  </div>
                )}

                {/* Stop Card */}
                <div
                  className={`p-2.5 rounded-xl border transition-all text-xs ${
                    stop.is_depot
                      ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold truncate text-slate-900 dark:text-white pr-2">
                      {stop.name}
                    </div>

                    <span
                      className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded shrink-0 ${
                        isFirst
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isLast
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                      }`}
                    >
                      {isFirst
                        ? `Depart: ${stop.eta}`
                        : isLast
                        ? `Return: ${stop.eta}`
                        : `Arrive: ${stop.eta}`}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Expandable Technical AI & Algorithm Details */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>How AI & Algorithms Optimized This</span>
          </div>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <TrendingDown className="w-4 h-4" />
              <span>
                2-Opt untangled path crossings: {result.two_opt_improvement_pct}% distance saved
                ({result.two_opt_swaps} edge swaps).
              </span>
            </div>
            <div>
              • <b>AI Traffic Prediction:</b>{' '}
              {result.ml_applied ? 'Active (congestion & rain weights)' : 'Disabled (distance only)'}.
            </div>
            <div>
              • <b>Algorithm:</b> {result.algorithm_used} Search solved all intersections in{' '}
              <b>{result.compute_time_ms} ms</b>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
