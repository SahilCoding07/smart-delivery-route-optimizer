import React from 'react';
import {
  Truck,
  BrainCircuit,
  Cpu,
  GitBranch,
  ShieldCheck,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const AboutTab: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
          <Truck className="w-4 h-4" />
          <span>About RouteWise</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Smart Delivery Route Optimizer with ETA Prediction
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
          A full-stack logistics solution engineered for local commercial couriers, tiffin services,
          and grocery distributors. Bridging classical Graph Theory with Machine Learning to plan optimal
          delivery orders and predict realistic arrival times.
        </p>

        <div className="pt-2 flex flex-wrap gap-2">
          <a
            href="https://github.com/SahilCoding07/smart-delivery-route-optimizer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>

      {/* The Core Innovation Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
          <BrainCircuit className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            The Core Engineering Innovation
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Standard routing systems optimize solely on <b>static physical distance</b> (kilometers).
          However, a shorter road can be 3x slower during rush hour or heavy rain due to traffic congestion.
        </p>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          In <b>RouteWise</b>, our trained Random Forest model predicts real-time transit times based on
          departure hours, weather, and road hierarchy. These predicted minutes are injected directly as{' '}
          <strong className="text-purple-600 dark:text-purple-400">graph edge weights</strong> into
          Dijkstra, A*, and TSP solvers. The algorithm naturally steers vehicles around congested residential
          chokepoints onto faster arterials, optimizing for <b>fastest real-world arrival times</b>.
        </p>
      </div>

      {/* Architecture & Tech Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400">
            <Cpu className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Structures & Algorithms
            </h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
            <li>
              <b>Spatial Adjacency Graph:</b> Custom Graph class tracking node coordinates and street properties.
            </li>
            <li>
              <b>Binary Min-Heap:</b> Hand-written indexed priority queue with O(log n) decrease-key.
            </li>
            <li>
              <b>Admissible A* Search:</b> Guided with Haversine speed heuristic; verified against NetworkX.
            </li>
            <li>
              <b>Multi-Stop TSP:</b> Nearest Neighbour construction + 2-Opt local search improvement.
            </li>
            <li>
              <b>Brute-Force Solver:</b> Exact permutation validator for small inputs (N ≤ 9).
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <Code2 className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Technology Stack
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="block text-slate-900 dark:text-white">Backend</strong>
              <span className="text-slate-500">Python 3.11+, FastAPI, Pydantic v2</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="block text-slate-900 dark:text-white">Machine Learning</strong>
              <span className="text-slate-500">Scikit-learn, NumPy, Pandas, Joblib</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="block text-slate-900 dark:text-white">Frontend</strong>
              <span className="text-slate-500">React 18, TypeScript, Vite, Tailwind CSS</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <strong className="block text-slate-900 dark:text-white">Mapping & Charts</strong>
              <span className="text-slate-500">Leaflet (react-leaflet), Recharts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Note on Simulated Traffic */}
      <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold block">Academic Transparency Note:</strong>
          <p className="leading-relaxed">
            Real commercial telematics speed feeds (e.g., Google Maps Traffic API) require proprietary billing accounts.
            RouteWise is trained on a synthetic dataset of 50,000 trips generated via realistic urban physics:
            peak-hour rush delays (8-10 AM, 5-8 PM), rain slowdowns, and intersection turn penalties with stochastic Gaussian noise.
          </p>
        </div>
      </div>
    </div>
  );
};
