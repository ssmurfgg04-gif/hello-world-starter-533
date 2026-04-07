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
  showTrails: boolean;
  showRelations: boolean;
  showZones: boolean;

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
  toggleTrails: () => void;
  toggleRelations: () => void;
  toggleZones: () => void;

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

const MAX_TRAIL_LENGTH = 120;

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
  showTrails: true,
  showRelations: true,
  showZones: true,

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
      const updated = [...existing, point].slice(-MAX_TRAIL_LENGTH);
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
  toggleTrails: () => set((s) => ({ showTrails: !s.showTrails })),
  toggleRelations: () => set((s) => ({ showRelations: !s.showRelations })),
  toggleZones: () => set((s) => ({ showZones: !s.showZones })),

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
