/**
 * Fusion engine orchestrator.
 *
 * This service coordinates entity fusion. In the initial implementation
 * it uses a pure-TypeScript heuristic engine. The architecture is designed
 * so the heavy computation can be delegated to a WebAssembly module running
 * inside a Web Worker once the Rust/WASM build pipeline is in place.
 */

import type { Entity, FusionRelation, FusionResult } from '@/types/entities';
import { haversineMetres } from '@/lib/geo';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Maximum distance (in metres) for a proximity relation. */
const PROXIMITY_THRESHOLD_M = 500;

/** Minimum confidence to emit a relation. */
const MIN_CONFIDENCE = 0.3;

/** Interval between automatic fusion passes (ms). */
const AUTO_FUSE_INTERVAL_MS = 5_000;

// ---------------------------------------------------------------------------
// Heuristic fusion (TypeScript fallback)
// ---------------------------------------------------------------------------

/**
 * Perform a simple proximity-based fusion pass over the entity set.
 *
 * For every pair of entities from *different* providers, check whether they
 * are within `PROXIMITY_THRESHOLD_M` metres of each other. If so, emit a
 * proximity relation with a confidence inversely proportional to distance.
 */
function fuseProximity(entities: Entity[]): FusionRelation[] {
  const relations: FusionRelation[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      // Only fuse across different providers / entity types
      if (a.provider === b.provider && a.type === b.type) continue;

      const dist = haversineMetres(
        a.position.lat,
        a.position.lon,
        b.position.lat,
        b.position.lon,
      );

      if (dist <= PROXIMITY_THRESHOLD_M) {
        const confidence = 1 - dist / PROXIMITY_THRESHOLD_M;
        if (confidence >= MIN_CONFIDENCE) {
          relations.push({
            entityIds: [a.id, b.id],
            type: 'proximity',
            confidence,
            description: `${a.label} and ${b.label} are within ${Math.round(dist)}m`,
            detectedAt: now,
          });
        }
      }
    }
  }

  return relations;
}

/**
 * Run the full fusion pipeline and return the result.
 *
 * In the future this will delegate to the WASM module via a Web Worker.
 */
export function runFusion(entities: Entity[]): FusionResult {
  const start = performance.now();
  const relations = fuseProximity(entities);
  const durationMs = performance.now() - start;

  return {
    relations,
    entityCount: entities.length,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Auto-fuse loop
// ---------------------------------------------------------------------------

let autoFuseTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the automatic fusion loop that periodically processes all entities
 * in the global store.
 */
export function startAutoFuse(): void {
  if (autoFuseTimer) return;

  autoFuseTimer = setInterval(() => {
    const store = useEntityStore.getState();
    const entities = Array.from(store.entities.values());

    if (entities.length < 2) return;

    const result = runFusion(entities);
    store.setRelations(result.relations);

    if (result.relations.length > 0) {
      console.info(
        `[fusionEngine] Found ${result.relations.length} relations among ${result.entityCount} entities in ${result.durationMs.toFixed(1)}ms`,
      );
    }
  }, AUTO_FUSE_INTERVAL_MS);
}

/**
 * Stop the automatic fusion loop.
 */
export function stopAutoFuse(): void {
  if (autoFuseTimer) {
    clearInterval(autoFuseTimer);
    autoFuseTimer = null;
  }
}
