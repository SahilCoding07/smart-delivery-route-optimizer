import { Truck, Activity, Cpu, BarChart3, Info, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'insights' | 'algorithms' | 'about';
  setActiveTab: (tab: 'dashboard' | 'insights' | 'algorithms' | 'about') => void;
  cityName: string;
  isBackendConnected: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cityName,
  isBackendConnected,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-xs transition-colors">
      <div className="flex items-center space-x-3">
        <div className="bg-sky-500 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              RouteWise
            </span>
            <span className="bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs px-2 py-0.5 rounded-full font-semibold border border-sky-200 dark:border-sky-800">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            Smart Delivery Route Optimizer with ML-powered ETA
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Planner</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'insights'
              ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('algorithms')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'algorithms'
              ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Algorithms</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'about'
              ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>About</span>
        </button>
      </nav>

      {/* Right Tools: Dark Mode & Connection Status */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <span className="hidden xl:inline-flex items-center text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
          City: <strong className="text-slate-700 dark:text-slate-200 ml-1">{cityName || 'Dehradun'}</strong>
        </span>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Backend Status Pill */}
        <div className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className={isBackendConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
            {isBackendConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};
