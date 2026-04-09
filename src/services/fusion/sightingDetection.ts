/**
 * Sighting Detection Service
 * 
 * Detects aircraft-vessel proximity events ("Dark Fleet" tracking).
 * Saves sightings to PostgreSQL for investigative analysis.
 * Uses free AI APIs for pattern analysis.
 */

import { useEntityStore } from '@/store/entityStore';
import { getPrisma } from '@/services/persistence/dbService';
import type { Entity } from '@/types/entities';

// Proximity threshold in km
const DEFAULT_PROXIMITY_KM = 50;
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

// Active sightings being tracked
const activeSightings = new Map<string, {
  aircraftId: string;
  vesselId: string;
  firstSeen: Date;
  lastDistance: number;
}>();

let detectionTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Check if coordinates form a suspicious pattern (e.g., vessel with AIS off)
 */
async function analyzeWithAI(aircraft: Entity, vessel: Entity, distanceKm: number): Promise<{
  summary: string;
  riskScore: number;
}> {
  // Use OpenRouter free tier or similar for analysis
  // For now, implement basic heuristic analysis
  
  const riskFactors = [];
  let riskScore = 0.1; // Base risk
  
  // AIS off detection (vessel not updating but aircraft nearby)
  if (vessel.provider === 'demo-vessel') {
    // Demo vessels don't have real AIS
    riskFactors.push('Vessel using demo data - may indicate limited visibility');
  }
  
  // Low altitude aircraft near vessel
  if (aircraft.position.alt && aircraft.position.alt < 1000) {
    riskScore += 0.3;
    riskFactors.push('Low altitude aircraft near vessel (possible surveillance)');
  }
  
  // Close proximity
  if (distanceKm < 10) {
    riskScore += 0.4;
    riskFactors.push('Very close proximity (< 10km)');
  } else if (distanceKm < 25) {
    riskScore += 0.2;
    riskFactors.push('Close proximity (< 25km)');
  }
  
  // Speed correlation (similar speeds might indicate rendezvous)
  const speedDiff = Math.abs(aircraft.speed - vessel.speed);
  if (speedDiff < 20) {
    riskScore += 0.1;
    riskFactors.push('Similar speeds (possible coordination)');
  }
  
  // Generate summary
  const summary = riskFactors.length > 0
    ? `Risk factors detected: ${riskFactors.join('; ')}`
    : 'Routine proximity - no immediate risk factors';
  
  return { summary, riskScore: Math.min(riskScore, 1.0) };
}

/**
 * Save sighting to database
 */
async function saveSighting(
  aircraft: Entity,
  vessel: Entity,
  distanceKm: number,
  aiAnalysis: { summary: string; riskScore: number }
): Promise<void> {
  try {
    const client = getPrisma();
    
    await client.sighting.create({
      data: {
        entityAId: aircraft.id,
        entityAType: 'aircraft',
        entityALabel: aircraft.label,
        entityALat: aircraft.position.lat,
        entityALon: aircraft.position.lon,
        entityAAlt: aircraft.position.alt,
        entityAHeading: aircraft.heading,
        entityASpeed: aircraft.speed,
        
        entityBId: vessel.id,
        entityBType: 'vessel',
        entityBLabel: vessel.label,
        entityBLat: vessel.position.lat,
        entityBLon: vessel.position.lon,
        entityBHeading: vessel.heading,
        entityBSpeed: vessel.speed,
        
        distanceKm,
        proximityRadiusKm: DEFAULT_PROXIMITY_KM,
        
        aiSummary: aiAnalysis.summary,
        aiRiskScore: aiAnalysis.riskScore,
        
        firstSeen: new Date(),
        detectedAt: new Date(),
        
        tags: aiAnalysis.riskScore > 0.5 ? ['high-risk', 'dark-fleet-candidate'] : [],
      },
    });
    
    console.info(`[sightingDetection] Saved sighting: ${aircraft.label} <> ${vessel.label} (${distanceKm.toFixed(1)}km)`);
  } catch (err) {
    console.error('[sightingDetection] Failed to save sighting:', err);
  }
}

/**
 * Update existing sighting with duration
 */
async function updateSightingDuration(
  aircraftId: string,
  vesselId: string,
  durationSeconds: number
): Promise<void> {
  try {
    const client = getPrisma();
    
    await client.sighting.updateMany({
      where: {
        entityAId: aircraftId,
        entityBId: vesselId,
        lastSeen: null,
      },
      data: {
        durationSeconds,
      },
    });
  } catch (err) {
    // Ignore - sighting may have been closed
  }
}

/**
 * Close sighting when entities separate
 */
async function closeSighting(aircraftId: string, vesselId: string): Promise<void> {
  try {
    const client = getPrisma();
    
    await client.sighting.updateMany({
      where: {
        entityAId: aircraftId,
        entityBId: vesselId,
        lastSeen: null,
      },
      data: {
        lastSeen: new Date(),
      },
    });
    
    console.info(`[sightingDetection] Closed sighting: ${aircraftId} <> ${vesselId}`);
  } catch (err) {
    console.error('[sightingDetection] Failed to close sighting:', err);
  }
}

/**
 * Run proximity detection check
 */
async function runDetection(): Promise<void> {
  const state = useEntityStore.getState();
  const entities = Array.from(state.entities.values());
  
  const aircraft = entities.filter(e => e.type === 'aircraft');
  const vessels = entities.filter(e => e.type === 'vessel');
  
  if (aircraft.length === 0 || vessels.length === 0) return;
  
  const currentSightings = new Set<string>();
  
  // Check all pairs
  for (const ac of aircraft) {
    for (const vessel of vessels) {
      const distance = calculateDistanceKm(
        ac.position.lat, ac.position.lon,
        vessel.position.lat, vessel.position.lon
      );
      
      const sightingKey = `${ac.id}:${vessel.id}`;
      
      if (distance <= DEFAULT_PROXIMITY_KM) {
        currentSightings.add(sightingKey);
        
        const existing = activeSightings.get(sightingKey);
        
        if (!existing) {
          // New sighting
          const aiAnalysis = await analyzeWithAI(ac, vessel, distance);
          await saveSighting(ac, vessel, distance, aiAnalysis);
          
          activeSightings.set(sightingKey, {
            aircraftId: ac.id,
            vesselId: vessel.id,
            firstSeen: new Date(),
            lastDistance: distance,
          });
          
          // Trigger alert if high risk
          if (aiAnalysis.riskScore > 0.5) {
            window.dispatchEvent(new CustomEvent('sighting-alert', {
              detail: {
                aircraft: ac,
                vessel,
                distance,
                riskScore: aiAnalysis.riskScore,
                summary: aiAnalysis.summary,
              }
            }));
          }
        } else {
          // Update duration
          const durationSeconds = Math.floor((Date.now() - existing.firstSeen.getTime()) / 1000);
          await updateSightingDuration(ac.id, vessel.id, durationSeconds);
          existing.lastDistance = distance;
        }
      }
    }
  }
  
  // Close sightings that are no longer active
  for (const [key, sighting] of activeSightings) {
    if (!currentSightings.has(key)) {
      await closeSighting(sighting.aircraftId, sighting.vesselId);
      activeSightings.delete(key);
    }
  }
}

/**
 * Start sighting detection
 */
export function startSightingDetection(): void {
  if (detectionTimer) return;
  
  console.info('[sightingDetection] Starting aircraft-vessel proximity detection');
  
  // Run immediately
  runDetection();
  
  // Schedule regular checks
  detectionTimer = setInterval(runDetection, CHECK_INTERVAL_MS);
}

/**
 * Stop sighting detection
 */
export function stopSightingDetection(): void {
  if (detectionTimer) {
    clearInterval(detectionTimer);
    detectionTimer = null;
  }
  
  // Close all active sightings
  for (const [key, sighting] of activeSightings) {
    closeSighting(sighting.aircraftId, sighting.vesselId);
    activeSightings.delete(key);
  }
  
  console.info('[sightingDetection] Stopped');
}

/**
 * Get recent sightings from database
 */
export async function getRecentSightings(limit: number = 50) {
  const client = getPrisma();
  
  return client.sighting.findMany({
    orderBy: {
      detectedAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get high-risk sightings
 */
export async function getHighRiskSightings(minRiskScore: number = 0.5) {
  const client = getPrisma();
  
  return client.sighting.findMany({
    where: {
      aiRiskScore: {
        gte: minRiskScore,
      },
    },
    orderBy: {
      detectedAt: 'desc',
    },
  });
}
