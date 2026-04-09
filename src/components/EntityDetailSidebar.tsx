import { useEntityStore } from '@/store/entityStore';
import { knotsToKmh, metresToFeet } from '@/lib/geo';

interface EntityDetailSidebarProps {
  onCenterOnEntity?: (lat: number, lon: number) => void;
}

/**
 * Sidebar panel that shows full metadata for a selected entity.
 * Appears on the right side when an entity is clicked on the map.
 */
export function EntityDetailSidebar({ onCenterOnEntity }: EntityDetailSidebarProps) {
  const selectedId = useEntityStore((s) => s.selectedEntityId);
  const entities = useEntityStore((s) => s.entities);
  const trails = useEntityStore((s) => s.trails);
  const clearSelection = useEntityStore((s) => s.clearSelection);

  if (!selectedId) return null;

  const entity = entities.get(selectedId);
  if (!entity) return null;

  const trail = trails.get(selectedId) ?? [];
  const isAircraft = entity.type === 'aircraft';

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-border/40 bg-background/90 shadow-2xl backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 p-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              entity.type === 'aircraft' ? 'bg-blue-500' : 
              entity.type === 'satellite' ? 'bg-purple-500' : 'bg-teal-500'
            }`}
          />
          <h3 className="text-lg font-bold text-foreground">{entity.label}</h3>
        </div>
        <div className="flex gap-2">
          {onCenterOnEntity && (
            <button
              onClick={() => {
                if (entity) onCenterOnEntity(entity.position.lat, entity.position.lon);
              }}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              title="Center map on this entity"
            >
              Center
            </button>
          )}
          <button
            onClick={clearSelection}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            title="Close (Esc)"
          >
            Close
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Identity */}
          <Section title="Identity">
            <Row label="ID" value={entity.id} />
            <Row label="Callsign / Name" value={entity.label} />
            <Row label="Type" value={entity.type} />
            <Row label="Provider" value={entity.provider} />
          </Section>

          {/* Position */}
          <Section title="Position">
            <Row label="Latitude" value={entity.position.lat.toFixed(5)} />
            <Row label="Longitude" value={entity.position.lon.toFixed(5)} />
            {entity.position.alt !== undefined && (
              <Row
                label="Altitude"
                value={`${metresToFeet(entity.position.alt).toFixed(0)} ft (${entity.position.alt.toFixed(0)} m)`}
              />
            )}
          </Section>

          {/* Dynamics */}
          <Section title="Dynamics">
            <Row
              label="Speed"
              value={`${entity.speed.toFixed(1)} kts (${knotsToKmh(entity.speed).toFixed(1)} km/h)`}
            />
            <Row label="Heading" value={`${entity.heading.toFixed(1)}\u00B0`} />
          </Section>

          {/* Metadata */}
          {entity.meta && Object.keys(entity.meta).length > 0 && (
            <Section title="Metadata">
              {Object.entries(entity.meta).map(([key, value]) =>
                value !== undefined && value !== null ? (
                  <Row key={key} label={key} value={String(value)} />
                ) : null,
              )}
            </Section>
          )}

          {/* Trail info */}
          <Section title="Track History">
            <Row label="Trail points" value={String(trail.length)} />
            {trail.length > 0 && (
              <>
                <Row label="First seen" value={trail[0].ts} />
                <Row label="Last update" value={trail[trail.length - 1].ts} />
              </>
            )}
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 p-3 text-[10px] text-muted-foreground">
        Last seen: {entity.lastSeen}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1 text-xs">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-foreground/90">{value}</span>
    </div>
  );
}
