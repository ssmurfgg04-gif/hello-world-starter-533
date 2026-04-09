import { useEntityStore } from '@/store/entityStore';
import type { ConnectionStatus, DataProvider } from '@/types/entities';

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colour: Record<ConnectionStatus, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colour[status]}`} />;
}

// ---------------------------------------------------------------------------
// Control panel
// ---------------------------------------------------------------------------

export function ControlPanel() {
  const entities = useEntityStore((s) => s.entities);
  const relations = useEntityStore((s) => s.relations);
  const serviceStatuses = useEntityStore((s) => s.serviceStatuses);

  const showAircraft = useEntityStore((s) => s.showAircraft);
  const showVessels = useEntityStore((s) => s.showVessels);
  const showSatellites = useEntityStore((s) => s.showSatellites);
  const showTrails = useEntityStore((s) => s.showTrails);
  const showRelations = useEntityStore((s) => s.showRelations);
  const showZones = useEntityStore((s) => s.showZones);

  const toggleAircraft = useEntityStore((s) => s.toggleAircraft);
  const toggleVessels = useEntityStore((s) => s.toggleVessels);
  const toggleSatellites = useEntityStore((s) => s.toggleSatellites);
  const toggleTrails = useEntityStore((s) => s.toggleTrails);
  const toggleRelations = useEntityStore((s) => s.toggleRelations);
  const toggleZones = useEntityStore((s) => s.toggleZones);
  
  const enabledProviders = useEntityStore((s) => s.enabledProviders);
  const toggleProvider = useEntityStore((s) => s.toggleProvider);
  
  const trailLength = useEntityStore((s) => s.trailLength);
  const setTrailLength = useEntityStore((s) => s.setTrailLength);
  
  const minSpeedFilter = useEntityStore((s) => s.minSpeedFilter);
  const setMinSpeedFilter = useEntityStore((s) => s.setMinSpeedFilter);
  const maxEntities = useEntityStore((s) => s.maxEntities);
  const setMaxEntities = useEntityStore((s) => s.setMaxEntities);
  const autoZoomToCritical = useEntityStore((s) => s.autoZoomToCritical);
  const toggleAutoZoom = useEntityStore((s) => s.toggleAutoZoom);

  const aircraftCount = Array.from(entities.values()).filter((e) => e.type === 'aircraft').length;
  const vesselCount = Array.from(entities.values()).filter((e) => e.type === 'vessel').length;
  const satelliteCount = Array.from(entities.values()).filter((e) => e.type === 'satellite').length;

  const statusFor = (provider: DataProvider): ConnectionStatus =>
    serviceStatuses.get(provider)?.status ?? 'disconnected';

  return (
    <div className="absolute left-3 top-3 z-40 flex w-52 flex-col gap-2 rounded-lg border border-white/10 bg-black/70 p-3 text-sm text-white shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <h2 className="text-base font-bold tracking-tight text-white">
        OSINT Command
      </h2>

      {/* Connection statuses */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('opensky')} />
          <span>OpenSky (Aircraft)</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('nasa')} />
          <span>NASA ISS</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('celestrak')} />
          <span>Celestrak (Sats)</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('marine-traffic')} />
          <span>AIS Maritime</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('usgs')} />
          <span>USGS Earthquakes</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('gdacs')} />
          <span>GDACS Disasters</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded bg-blue-500/10 p-1.5">
          <div className="text-lg font-semibold text-blue-400">{aircraftCount}</div>
          <div className="text-gray-400">Aircraft</div>
        </div>
        <div className="rounded bg-teal-500/10 p-1.5">
          <div className="text-lg font-semibold text-teal-400">{vesselCount}</div>
          <div className="text-gray-400">Vessels</div>
        </div>
        <div className="rounded bg-purple-500/10 p-1.5">
          <div className="text-lg font-semibold text-purple-400">{satelliteCount}</div>
          <div className="text-gray-400">Satellites</div>
        </div>
        <div className="rounded bg-muted/50 p-1.5">
          <div className="text-lg font-semibold text-white">{entities.size}</div>
          <div className="text-gray-400">Total</div>
        </div>
      </div>

      {/* Fusion relations */}
      {relations.length > 0 && (
        <div className="rounded bg-amber-500/10 p-2 text-xs">
          <span className="font-semibold text-amber-400">{relations.length}</span>{' '}
          <span className="text-gray-400">fusion relations detected</span>
        </div>
      )}

      {/* Provider filters */}
      <div className="border-t border-border/30 pt-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Data Sources
        </div>
        <div className="space-y-1">
          {[
            { key: 'opensky', label: 'OpenSky Aircraft' },
            { key: 'nasa', label: 'NASA ISS' },
            { key: 'celestrak', label: 'Celestrak Sats' },
            { key: 'marine-traffic', label: 'AIS Maritime' },
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={enabledProviders.has(key as DataProvider)}
                onChange={() => toggleProvider(key as DataProvider)}
                className="accent-green-500"
              />
              <span className={enabledProviders.has(key as DataProvider) ? '' : 'text-gray-500'}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Layer toggles */}
      <div className="border-t border-border/30 pt-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Layers
        </div>
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={showAircraft} onChange={toggleAircraft} className="accent-blue-500" />
            Aircraft
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={showVessels} onChange={toggleVessels} className="accent-teal-500" />
            Vessels
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={showSatellites} onChange={toggleSatellites} className="accent-purple-500" />
            Satellites
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={showTrails} onChange={toggleTrails} className="accent-gray-500" />
            Trails
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={showRelations} onChange={toggleRelations} className="accent-amber-500" />
            Fusion arcs
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={showZones} onChange={toggleZones} className="accent-red-500" />
            Zones
          </label>
        </div>
      </div>

      {/* Trail length control */}
      <div className="border-t border-border/30 pt-2">
        <div className="mb-1 flex justify-between text-[10px] text-gray-400">
          <span className="font-semibold uppercase tracking-wider">Trail History</span>
          <span>{trailLength} pts</span>
        </div>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={trailLength}
          onChange={(e) => setTrailLength(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>10</span>
          <span>500</span>
        </div>
      </div>

      {/* Performance & Filter Settings */}
      <div className="border-t border-border/30 pt-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </div>
        
        {/* Speed filter */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Min Speed</span>
            <span>{minSpeedFilter === 0 ? 'All' : `${minSpeedFilter}+ kts`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="50"
            value={minSpeedFilter}
            onChange={(e) => setMinSpeedFilter(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>0</span>
            <span>500</span>
          </div>
        </div>
        
        {/* Max entities */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Max Entities</span>
            <span>{maxEntities}</span>
          </div>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={maxEntities}
            onChange={(e) => setMaxEntities(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>50</span>
            <span>2000</span>
          </div>
        </div>
        
        {/* Auto-zoom toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoZoomToCritical}
            onChange={toggleAutoZoom}
            className="accent-red-500"
          />
          Auto-zoom to critical events
        </label>
      </div>

      {/* Export & Fullscreen buttons */}
      <div className="border-t border-border/30 pt-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Actions
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('trigger-export'))}
            className="flex-1 rounded bg-muted/50 px-2 py-1.5 text-xs hover:bg-muted"
            title="Export data (E)"
          >
            Export
          </button>
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="flex-1 rounded bg-muted/50 px-2 py-1.5 text-xs hover:bg-muted"
            title="Toggle fullscreen (F)"
          >
            Fullscreen
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="space-y-0.5 text-[10px] text-muted-foreground">
        <div><kbd className="rounded bg-muted/60 px-1">1-6</kbd> Layers <kbd className="rounded bg-muted/60 px-1">F</kbd> Full <kbd className="rounded bg-muted/60 px-1">E</kbd> Export</div>
        <div><kbd className="rounded bg-muted/60 px-1">/</kbd> Search <kbd className="rounded bg-muted/60 px-1">Esc</kbd> Clear</div>
      </div>

      <div className="border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
        OSINT Platform v2 &middot; Deck.gl + WASM
      </div>
    </div>
  );
}
