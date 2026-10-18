import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  BrainCircuit,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import { MLMetrics } from '../../types';
import { fetchMLMetrics } from '../../services/api';

export const InsightsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  useEffect(() => {
    fetchMLMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.warn('Could not load ML metrics:', err));
  }, []);

  // Format data for Recharts
  const chartData = metrics
    ? Object.entries(metrics.models).map(([name, m]) => ({
        name,
        MAE: m.MAE_minutes,
        RMSE: m.RMSE_minutes,
        R2: Math.round(m.R2_score * 100),
      }))
    : [
        { name: 'Naive Baseline', MAE: 2.975, RMSE: 4.659, R2: 57 },
        { name: 'Linear Regression', MAE: 1.324, RMSE: 2.143, R2: 91 },
        { name: 'Random Forest', MAE: 0.547, RMSE: 0.764, R2: 99 },
      ];

  const featureImportances = [
    { feature: 'Distance (km)', importance: '46.2%', desc: 'Primary predictor of base travel time' },
    { feature: 'Road Type (Hierarchy)', importance: '24.8%', desc: 'Residential (28 km/h) vs Highway (75 km/h)' },
    { feature: 'Peak Rush Hours', importance: '14.5%', desc: 'Weekday 8-10 AM & 5-8 PM congestion delays' },
    { feature: 'Rain Condition', importance: '8.3%', desc: 'Adverse weather braking and speed reduction' },
    { feature: 'Intersection Turns', importance: '6.2%', desc: 'Deceleration and waiting delays at junctions' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <span className="text-xs uppercase font-bold tracking-wider text-purple-300">
            Supervised Machine Learning Pipeline
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          ETA Travel Time Model Comparison
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-3xl mt-2 leading-relaxed">
          Trained on 50,000 simulated urban delivery trips across diverse road classifications,
          rush-hour congestion windows, and weather conditions.
        </p>

        {/* Champion Badge */}
        <div className="mt-6 inline-flex items-center space-x-3 bg-purple-500/10 border border-purple-400/30 px-4 py-2.5 rounded-xl">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <strong className="text-white">Champion Model: Random Forest Regressor</strong>{' '}
            <span className="text-purple-300 ml-1">
              (R² = 0.9883 • MAE = ~32 seconds • 81% error reduction over baseline)
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Random Forest MAE</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            0.55 <span className="text-sm font-normal text-slate-500">minutes</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Average prediction deviation is within ±33 seconds across all trips.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Explained Variance (R²)</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            98.8%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accounts for almost all variance across road types, congestion, and rain.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Dataset Volume</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            50,000 <span className="text-sm font-normal text-slate-500">trips</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            80% Train split (40,000 trips) • 20% Unseen Test holdout (10,000 trips).
          </p>
        </div>
      </div>

      {/* Chart: Model Comparison */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Model Accuracy Benchmark (MAE & RMSE in Minutes)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lower error indicates superior predictive performance on unseen holdout test data.
          </p>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis
                label={{ value: 'Error (Minutes)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="MAE" fill="#0284c7" name="Mean Absolute Error (min)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="RMSE" fill="#f59e0b" name="Root Mean Squared Error (min)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Importance Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Feature Importance (Gini Impurity Metric)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Relative impact of trip factors when predicting delivery transit times.
          </p>
        </div>

        <div className="space-y-3">
          {featureImportances.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 mr-1.5" />
                  {item.feature}
                </span>
                <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                  {item.importance}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
