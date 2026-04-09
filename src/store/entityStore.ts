import { create } from 'zustand';
import type {
  Entity,
  EntityTrail,
  FusionRelation,
  ServiceStatus,
  DataProvider,
  ConnectionStatus,
} from '@/types/entities';

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface EntityState {
  /** Map of entity id -> Entity for O(1) lookups. */
  entities: Map<string, Entity>;
  /** Map of entity id -> recent trail positions. */
  trails: Map<string, EntityTrail>;
  /** Detected fusion relations from the last pass. */
  relations: FusionRelation[];
  /** Connection status for each data provider. */
  serviceStatuses: Map<DataProvider, ServiceStatus>;

  // Layer visibility toggles
  showAircraft: boolean;
  showVessels: boolean;
  showSatellites: boolean;
  showTrails: boolean;
  showRelations: boolean;
  showZones: boolean;
  
  // Provider filters (which data sources to show)
  enabledProviders: Set<DataProvider>;
  
  // Trail configuration
  trailLength: number;
  maxTrailLength: number;
  
  // Filtering
  minSpeedFilter: number; // Show only entities with speed > this (knots)
  maxEntities: number; // Performance limit
  
  // Auto-zoom settings
  autoZoomToCritical: boolean;

  /** Currently selected entity id (for detail sidebar). */
  selectedEntityId: string | null;
}

interface EntityActions {
  /** Upsert one or more entities into the store. */
  upsertEntities: (incoming: Entity[]) => void;
  /** Remove an entity by id. */
  removeEntity: (id: string) => void;
  /** Append a trail point for a given entity. Keeps at most `maxTrailLength` points. */
  appendTrail: (entityId: string, point: { lat: number; lon: number; alt?: number; ts: string }) => void;
  /** Replace the full set of fusion relations. */
  setRelations: (relations: FusionRelation[]) => void;
  /** Update the connection status for a provider. */
  setServiceStatus: (provider: DataProvider, status: ConnectionStatus, error?: string) => void;

  // Layer toggles
  toggleAircraft: () => void;
  toggleVessels: () => void;
  toggleSatellites: () => void;
  toggleTrails: () => void;
  toggleRelations: () => void;
  toggleZones: () => void;
  
  // Provider filters
  toggleProvider: (provider: DataProvider) => void;
  enableAllProviders: () => void;
  disableAllProviders: () => void;
  
  // Trail config
  setTrailLength: (length: number) => void;
  
  // Filtering
  setMinSpeedFilter: (speed: number) => void;
  setMaxEntities: (count: number) => void;
  toggleAutoZoom: () => void;

  /** Purge entities that have not been seen within `thresholdMs`. */
  pruneStale: (thresholdMs: number) => void;

  /** Select an entity by id (opens detail sidebar). */
  selectEntity: (id: string) => void;
  /** Clear the entity selection. */
  clearSelection: () => void;
}

export type EntityStore = EntityState & EntityActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TRAIL_LENGTH = 120;

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useEntityStore = create<EntityStore>((set, get) => ({
  entities: new Map(),
  trails: new Map(),
  relations: [],
  serviceStatuses: new Map(),

  showAircraft: true,
  showVessels: true,
  showSatellites: true,
  showTrails: true,
  showRelations: true,
  showZones: true,
  enabledProviders: new Set<DataProvider>(['adsb-exchange', 'marine-traffic', 'nasa', 'aprs-fi', 'opensky', 'celestrak']),
  trailLength: DEFAULT_TRAIL_LENGTH,
  maxTrailLength: 500,
  minSpeedFilter: 0, // 0 = show all
  maxEntities: 1000, // Max entities to display
  autoZoomToCritical: false,

  selectedEntityId: null,

  upsertEntities: (incoming) => {
    set((state) => {
      const next = new Map(state.entities);
      for (const entity of incoming) {
        next.set(entity.id, entity);
      }
      return { entities: next };
    });
  },

  removeEntity: (id) => {
    set((state) => {
      const next = new Map(state.entities);
      next.delete(id);
      const trails = new Map(state.trails);
      trails.delete(id);
      return { entities: next, trails };
    });
  },

  appendTrail: (entityId, point) => {
    set((state) => {
      const trails = new Map(state.trails);
      const existing = trails.get(entityId) ?? [];
      const updated = [...existing, point].slice(-state.trailLength);
      trails.set(entityId, updated);
      return { trails };
    });
  },

  setRelations: (relations) => set({ relations }),

  setServiceStatus: (provider, status, error) => {
    set((state) => {
      const statuses = new Map(state.serviceStatuses);
      statuses.set(provider, {
        provider,
        status,
        error,
        lastMessageAt:
          status === 'connected'
            ? new Date().toISOString()
            : statuses.get(provider)?.lastMessageAt,
      });
      return { serviceStatuses: statuses };
    });
  },

  toggleAircraft: () => set((s) => ({ showAircraft: !s.showAircraft })),
  toggleVessels: () => set((s) => ({ showVessels: !s.showVessels })),
  toggleSatellites: () => set((s) => ({ showSatellites: !s.showSatellites })),
  toggleTrails: () => set((s) => ({ showTrails: !s.showTrails })),
  toggleRelations: () => set((s) => ({ showRelations: !s.showRelations })),
  toggleZones: () => set((s) => ({ showZones: !s.showZones })),
  
  toggleProvider: (provider) => set((s) => {
    const next = new Set(s.enabledProviders);
    if (next.has(provider)) next.delete(provider);
    else next.add(provider);
    return { enabledProviders: next };
  }),
  enableAllProviders: () => set({ enabledProviders: new Set<DataProvider>(['adsb-exchange', 'marine-traffic', 'nasa', 'aprs-fi', 'opensky', 'celestrak', 'usgs', 'nasa-eonet', 'gdacs']) }),
  disableAllProviders: () => set({ enabledProviders: new Set<DataProvider>() }),
  setTrailLength: (length) => set({ trailLength: Math.max(10, Math.min(500, length)) }),
  setMinSpeedFilter: (speed) => set({ minSpeedFilter: Math.max(0, speed) }),
  setMaxEntities: (count) => set({ maxEntities: Math.max(50, Math.min(2000, count)) }),
  toggleAutoZoom: () => set((s) => ({ autoZoomToCritical: !s.autoZoomToCritical })),

  selectEntity: (id) => set({ selectedEntityId: id }),
  clearSelection: () => set({ selectedEntityId: null }),

  pruneStale: (thresholdMs) => {
    const now = Date.now();
    set((state) => {
      const next = new Map<string, Entity>();
      const trails = new Map(state.trails);
      for (const [id, entity] of state.entities) {
        const age = now - new Date(entity.lastSeen).getTime();
        if (age < thresholdMs) {
          next.set(id, entity);
        } else {
          trails.delete(id);
        }
      }
      return { entities: next, trails };
    });
  },
}));
