import { Truck, Activity, Cpu, BarChart3, Info } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'insights' | 'algorithms' | 'about';
  setActiveTab: (tab: 'dashboard' | 'insights' | 'algorithms' | 'about') => void;
  cityName: string;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cityName,
  isBackendConnected,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="bg-sky-500 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-slate-900">RouteWise</span>
            <span className="bg-sky-50 text-sky-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-sky-200">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            Smart Delivery Route Optimizer with ML-powered ETA
          </p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Planner</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'insights'
              ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>ML Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('algorithms')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'algorithms'
              ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Algorithms</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'about'
              ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>About</span>
        </button>
      </nav>

      {/* Connection & City Badge */}
      <div className="flex items-center space-x-3">
        <span className="hidden md:inline-flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
          City: <strong className="text-slate-700 ml-1">{cityName || 'Central Delhi'}</strong>
        </span>

        <div className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className={isBackendConnected ? 'text-emerald-700' : 'text-rose-700'}>
            {isBackendConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};
