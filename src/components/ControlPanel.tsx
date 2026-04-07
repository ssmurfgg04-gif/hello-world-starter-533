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
  const showTrails = useEntityStore((s) => s.showTrails);
  const showRelations = useEntityStore((s) => s.showRelations);

  const toggleAircraft = useEntityStore((s) => s.toggleAircraft);
  const toggleVessels = useEntityStore((s) => s.toggleVessels);
  const toggleTrails = useEntityStore((s) => s.toggleTrails);
  const toggleRelations = useEntityStore((s) => s.toggleRelations);

  const aircraftCount = Array.from(entities.values()).filter(
    (e) => e.type === 'aircraft',
  ).length;
  const vesselCount = entities.size - aircraftCount;

  const statusFor = (provider: DataProvider): ConnectionStatus =>
    serviceStatuses.get(provider)?.status ?? 'disconnected';

  return (
    <div className="absolute left-4 top-4 z-40 flex w-64 flex-col gap-3 rounded-lg border border-border/40 bg-background/80 p-4 text-sm shadow-xl backdrop-blur-lg">
      {/* Header */}
      <h2 className="text-base font-bold tracking-tight text-foreground">
        OSINT Command
      </h2>

      {/* Connection statuses */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('adsb-exchange')} />
          <span>ADS-B Exchange</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={statusFor('marine-traffic')} />
          <span>AIS / MarineTraffic</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-muted/50 p-1.5">
          <div className="text-lg font-semibold text-foreground">{entities.size}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="rounded bg-blue-500/10 p-1.5">
          <div className="text-lg font-semibold text-blue-400">{aircraftCount}</div>
          <div className="text-muted-foreground">Aircraft</div>
        </div>
        <div className="rounded bg-teal-500/10 p-1.5">
          <div className="text-lg font-semibold text-teal-400">{vesselCount}</div>
          <div className="text-muted-foreground">Vessels</div>
        </div>
      </div>

      {/* Fusion relations */}
      {relations.length > 0 && (
        <div className="rounded bg-amber-500/10 p-2 text-xs">
          <span className="font-semibold text-amber-400">{relations.length}</span>{' '}
          <span className="text-muted-foreground">fusion relations detected</span>
        </div>
      )}

      {/* Layer toggles */}
      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showAircraft}
            onChange={toggleAircraft}
            className="accent-blue-500"
          />
          Aircraft layer
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showVessels}
            onChange={toggleVessels}
            className="accent-teal-500"
          />
          Vessel layer
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showTrails}
            onChange={toggleTrails}
            className="accent-purple-500"
          />
          Trails
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showRelations}
            onChange={toggleRelations}
            className="accent-amber-500"
          />
          Fusion arcs
        </label>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="space-y-0.5 text-[10px] text-muted-foreground">
        <div><kbd className="rounded bg-muted/60 px-1">1-4</kbd> Toggle layers</div>
        <div><kbd className="rounded bg-muted/60 px-1">/</kbd> Search &middot; <kbd className="rounded bg-muted/60 px-1">Esc</kbd> Deselect</div>
      </div>

      <div className="border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
        OSINT Platform v2 &middot; Deck.gl + WASM
      </div>
    </div>
  );
}
