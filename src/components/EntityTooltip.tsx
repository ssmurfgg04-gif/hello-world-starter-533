import type { Entity } from '@/types/entities';
import { knotsToKmh, metresToFeet } from '@/lib/geo';

interface EntityTooltipProps {
  entity: Entity;
  x: number;
  y: number;
}

/**
 * Floating tooltip rendered over the Deck.gl canvas when hovering an entity.
 */
export function EntityTooltip({ entity, x, y }: EntityTooltipProps) {
  const isAircraft = entity.type === 'aircraft';

  return (
    <div
      className="pointer-events-none absolute z-50 min-w-[200px] rounded-md border border-border/60 bg-background/90 p-3 text-xs shadow-lg backdrop-blur-md"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{entity.label}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
            isAircraft
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-teal-500/20 text-teal-400'
          }`}
        >
          {entity.type}
        </span>
      </div>

      <div className="space-y-0.5 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/70">ID:</span> {entity.id}
        </div>
        <div>
          <span className="font-medium text-foreground/70">Pos:</span>{' '}
          {entity.position.lat.toFixed(4)}, {entity.position.lon.toFixed(4)}
        </div>
        {entity.position.alt !== undefined && (
          <div>
            <span className="font-medium text-foreground/70">Alt:</span>{' '}
            {metresToFeet(entity.position.alt).toFixed(0)} ft
          </div>
        )}
        <div>
          <span className="font-medium text-foreground/70">Speed:</span>{' '}
          {entity.speed.toFixed(1)} kts ({knotsToKmh(entity.speed).toFixed(1)} km/h)
        </div>
        <div>
          <span className="font-medium text-foreground/70">Hdg:</span>{' '}
          {entity.heading.toFixed(0)}&deg;
        </div>
        <div>
          <span className="font-medium text-foreground/70">Provider:</span>{' '}
          {entity.provider}
        </div>
      </div>
    </div>
  );
}
