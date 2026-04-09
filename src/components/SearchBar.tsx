import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useEntityStore } from '@/store/entityStore';

interface SearchBarProps {
  onCenterOnEntity?: (lat: number, lon: number) => void;
}

/**
 * Search / filter bar for finding entities by callsign, ID, or type.
 * Positioned at the top-center of the viewport.
 */
export function SearchBar({ onCenterOnEntity }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const entities = useEntityStore((s) => s.entities);
  const selectEntity = useEntityStore((s) => s.selectEntity);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Array.from(entities.values())
      .filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, entities]);

  const handleSelect = useCallback(
    (id: string) => {
      const entity = entities.get(id);
      selectEntity(id);
      if (entity && onCenterOnEntity) {
        onCenterOnEntity(entity.position.lat, entity.position.lon);
      }
      setQuery('');
      setIsOpen(false);
    },
    [selectEntity, entities, onCenterOnEntity],
  );

  // Close on click outside
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2 top-4 z-40 w-80 -translate-x-1/2"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search callsign, MMSI, type..."
        className="w-full rounded-lg border border-white/20 bg-black/70 px-4 py-2 text-sm text-white shadow-2xl backdrop-blur-xl placeholder:text-gray-400 focus:border-blue-400/50 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
      />

      {isOpen && results.length > 0 && (
        <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
          {results.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleSelect(entity.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  entity.type === 'aircraft' ? 'bg-blue-500' : 
                  entity.type === 'satellite' ? 'bg-purple-500' : 'bg-teal-500'
                }`}
              />
              <div className="flex-1">
                <div className="font-medium text-white">{entity.label}</div>
                <div className="text-[10px] text-gray-400">
                  {entity.type} &middot; {entity.id.slice(0, 20)}{entity.id.length > 20 ? '...' : ''}
                </div>
              </div>
              <div className="text-[10px] text-gray-400">
                {entity.speed.toFixed(0)} kts
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="mt-1 rounded-lg border border-white/10 bg-black/80 px-4 py-3 text-center text-xs text-gray-400 shadow-2xl backdrop-blur-xl">
          No entities match "{query}"
        </div>
      )}
    </div>
  );
}
