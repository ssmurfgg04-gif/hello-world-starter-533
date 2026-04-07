import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useEntityStore } from '@/store/entityStore';

/**
 * Search / filter bar for finding entities by callsign, ID, or type.
 * Positioned at the top-center of the viewport.
 */
export function SearchBar() {
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
      selectEntity(id);
      setQuery('');
      setIsOpen(false);
    },
    [selectEntity],
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
        className="w-full rounded-lg border border-border/40 bg-background/80 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur-lg placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
      />

      {isOpen && results.length > 0 && (
        <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-border/40 bg-background/90 shadow-xl backdrop-blur-lg">
          {results.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleSelect(entity.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50"
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  entity.type === 'aircraft' ? 'bg-blue-500' : 'bg-teal-500'
                }`}
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">{entity.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {entity.type} &middot; {entity.id} &middot; {entity.provider}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {entity.speed.toFixed(0)} kts
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="mt-1 rounded-lg border border-border/40 bg-background/90 px-4 py-3 text-center text-xs text-muted-foreground shadow-xl backdrop-blur-lg">
          No entities match "{query}"
        </div>
      )}
    </div>
  );
}
