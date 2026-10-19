import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, Plus, Loader2, X } from 'lucide-react';
import { searchLocations, SearchLocationResult } from '../../services/api';

interface LocationSearchBarProps {
  onAddStop: (name: string, lat: number, lon: number) => void;
  onSetDepot: (lat: number, lon: number) => void;
  onFlyTo?: (lat: number, lon: number) => void;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onAddStop,
  onSetDepot,
  onFlyTo,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchLocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchLocations(query);
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectAddStop = (item: SearchLocationResult) => {
    onAddStop(item.name || item.display_name.split(',')[0], item.lat, item.lon);
    if (onFlyTo) onFlyTo(item.lat, item.lon);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectSetDepot = (item: SearchLocationResult) => {
    onSetDepot(item.lat, item.lon);
    if (onFlyTo) onFlyTo(item.lat, item.lon);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md z-[1050]"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="relative flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg transition-all focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500">
        <div className="pl-3 text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
          ) : (
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault();
              handleSelectAddStop(results[0]);
            }
          }}
          placeholder="Search any place in India (e.g. Graphic Era, Bandra, Connaught Place, MG Road)..."
          className="w-full py-2.5 pl-2.5 pr-8 text-xs sm:text-sm bg-transparent border-none text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[1000] max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Matching Locations
          </div>
          {results.map((item) => (
            <div
              key={item.place_id}
              className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between group text-xs"
            >
              <div
                className="flex items-start space-x-2.5 min-w-0 pr-2 cursor-pointer flex-1"
                onClick={() => handleSelectAddStop(item)}
              >
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.display_name}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectAddStop(item)}
                  className="flex items-center space-x-1 px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-[11px] font-semibold transition-all shadow-2xs"
                  title="Add this location as a delivery stop"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Stop</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSetDepot(item)}
                  className="flex items-center space-x-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-medium transition-all"
                  title="Set as delivery warehouse depot"
                >
                  <Building2 className="w-3 h-3" />
                  <span>Depot</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-center text-xs text-slate-500 z-[1000]">
          No locations found for "{query}". Try another landmark, area, or street name in India.
        </div>
      )}
    </div>
  );
};
