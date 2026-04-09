/**
 * Database Persistence Service
 * 
 * Handles entity persistence to PostgreSQL + TimescaleDB
 * Provides reliable data pipeline with buffering and retry logic
 */

import type { Entity } from '@/types/entities';
import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

// Buffer for batch inserts
interface BufferItem {
  entity: Entity;
  timestamp: Date;
}

const historyBuffer: BufferItem[] = [];
const BUFFER_SIZE = 100;
const BUFFER_FLUSH_MS = 5000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize database connection and start buffer flush
 */
export async function initDatabase(): Promise<boolean> {
  try {
    const client = getPrisma();
    await client.$connect();
    
    // Start buffer flush timer
    if (!flushTimer) {
      flushTimer = setInterval(flushHistoryBuffer, BUFFER_FLUSH_MS);
    }
    
    console.info('[dbService] Database connected');
    return true;
  } catch (err) {
    console.error('[dbService] Database connection failed:', err);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  
  // Final buffer flush
  await flushHistoryBuffer();
  
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.info('[dbService] Database disconnected');
  }
}

/**
 * Persist entity current state
 */
export async function persistEntity(entity: Entity): Promise<void> {
  try {
    const client = getPrisma();
    
    await client.entity.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        label: entity.label,
        type: entity.type,
        provider: entity.provider,
        lat: entity.position.lat,
        lon: entity.position.lon,
        alt: entity.position.alt,
        heading: entity.heading,
        speed: entity.speed,
        meta: entity.meta as any,
        firstSeen: new Date(entity.lastSeen),
        lastSeen: new Date(entity.lastSeen),
      },
      update: {
        label: entity.label,
        lat: entity.position.lat,
        lon: entity.position.lon,
        alt: entity.position.alt,
        heading: entity.heading,
        speed: entity.speed,
        meta: entity.meta as any,
        lastSeen: new Date(entity.lastSeen),
      },
    });
  } catch (err) {
    console.error('[dbService] Failed to persist entity:', err);
    throw err;
  }
}

/**
 * Queue entity history for batch insert
 */
export function queueEntityHistory(entity: Entity): void {
  historyBuffer.push({
    entity,
    timestamp: new Date(),
  });
  
  // Flush if buffer is full
  if (historyBuffer.length >= BUFFER_SIZE) {
    flushHistoryBuffer();
  }
}

/**
 * Flush history buffer to database
 */
async function flushHistoryBuffer(): Promise<void> {
  if (historyBuffer.length === 0) return;
  
  const batch = historyBuffer.splice(0, historyBuffer.length);
  
  try {
    const client = getPrisma();
    
    // Batch insert using createMany
    await client.entityHistory.createMany({
      data: batch.map(item => ({
        entityId: item.entity.id,
        lat: item.entity.position.lat,
        lon: item.entity.position.lon,
        alt: item.entity.position.alt,
        heading: item.entity.heading,
        speed: item.entity.speed,
        timestamp: item.timestamp,
        source: item.entity.provider,
      })),
      skipDuplicates: true,
    });
    
    console.info(`[dbService] Flushed ${batch.length} history records`);
  } catch (err) {
    console.error('[dbService] Failed to flush history buffer:', err);
    // Put items back in buffer for retry
    historyBuffer.unshift(...batch);
  }
}

/**
 * Get entity history for a time range
 */
export async function getEntityHistory(
  entityId: string,
  startTime: Date,
  endTime: Date
) {
  const client = getPrisma();
  
  return client.entityHistory.findMany({
    where: {
      entityId,
      timestamp: {
        gte: startTime,
        lte: endTime,
      },
    },
    orderBy: {
      timestamp: 'asc',
    },
  });
}

/**
 * Get all entities with optional filtering
 */
export async function getEntities(options?: {
  type?: string;
  provider?: string;
  activeSince?: Date;
}) {
  const client = getPrisma();
  
  return client.entity.findMany({
    where: {
      ...(options?.type && { type: options.type as any }),
      ...(options?.provider && { provider: options.provider }),
      ...(options?.activeSince && { lastSeen: { gte: options.activeSince } }),
    },
    orderBy: {
      lastSeen: 'desc',
    },
  });
}

/**
 * Prune old history data
 */
export async function pruneOldHistory(olderThan: Date): Promise<number> {
  const client = getPrisma();
  
  const result = await client.entityHistory.deleteMany({
    where: {
      timestamp: {
        lt: olderThan,
      },
    },
  });
  
  console.info(`[dbService] Pruned ${result.count} old history records`);
  return result.count;
}

/**
 * Get database stats
 */
export async function getDatabaseStats() {
  const client = getPrisma();
  
  const [
    entityCount,
    historyCount,
    historyLast24h,
  ] = await Promise.all([
    client.entity.count(),
    client.entityHistory.count(),
    client.entityHistory.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);
  
  return {
    entities: entityCount,
    historyRecords: historyCount,
    historyLast24h,
    bufferSize: historyBuffer.length,
  };
}
