/**
 * Persistence Integration Service
 * 
 * Bridges the entity store with the database layer.
 * Automatically persists entity updates and history.
 */

import { useEntityStore } from '@/store/entityStore';
import { initDatabase, closeDatabase, persistEntity, queueEntityHistory, getDatabaseStats, pruneOldHistory } from './dbService';
import { getApiHealthStatus } from './apiHealthService';

let unsubscribe: (() => void) | null = null;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;
let pruneTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize persistence layer
 */
export async function initPersistence(): Promise<boolean> {
  // Try to connect to database
  const connected = await initDatabase();
  
  if (!connected) {
    console.warn('[persistence] Database unavailable, running in memory-only mode');
    return false;
  }
  
  // Subscribe to entity store changes
  const store = useEntityStore.getState();
  
  unsubscribe = useEntityStore.subscribe((state, prevState) => {
    // Check for new or updated entities
    for (const [id, entity] of state.entities) {
      const prevEntity = prevState.entities.get(id);
      
      if (!prevEntity || prevEntity.lastSeen !== entity.lastSeen) {
        // Entity is new or updated - persist it
        persistEntity(entity).catch(err => {
          console.error('[persistence] Failed to persist entity:', err);
        });
        
        // Queue history record
        queueEntityHistory(entity);
      }
    }
  });
  
  // Start health check logging
  healthCheckTimer = setInterval(() => {
    const health = getApiHealthStatus();
    const unhealthy = health.filter(h => !h.healthy);
    if (unhealthy.length > 0) {
      console.warn('[persistence] Unhealthy APIs:', unhealthy.map(h => h.provider).join(', '));
    }
  }, 60000); // Every minute
  
  // Start data pruning (daily)
  pruneTimer = setInterval(async () => {
    const retentionDays = parseInt(process.env.HISTORY_RETENTION_DAYS || '30', 10);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      const count = await pruneOldHistory(cutoff);
      console.info(`[persistence] Pruned ${count} records older than ${retentionDays} days`);
    } catch (err) {
      console.error('[persistence] Pruning failed:', err);
    }
  }, 24 * 60 * 60 * 1000); // Every 24 hours
  
  console.info('[persistence] Persistence layer initialized');
  return true;
}

/**
 * Shutdown persistence layer
 */
export async function shutdownPersistence(): Promise<void> {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
  
  await closeDatabase();
  console.info('[persistence] Persistence layer shutdown');
}

/**
 * Get persistence stats for monitoring
 */
export async function getPersistenceStats(): Promise<{
  database: Awaited<ReturnType<typeof getDatabaseStats>>;
  apiHealth: ReturnType<typeof getApiHealthStatus>;
}> {
  const dbStats = await getDatabaseStats();
  const apiHealth = getApiHealthStatus();
  
  return {
    database: dbStats,
    apiHealth,
  };
}
