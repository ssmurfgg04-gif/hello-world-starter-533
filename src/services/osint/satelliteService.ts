/**
 * Satellite tracking service using Celestrak TLE data.
 * 
 * FREE, no API key required.
 * https://celestrak.org/NORAD/documentation/gp-data-formats.php
 * 
 * Tracks major satellite constellations: Starlink, OneWeb, ISS,
 * GPS, Galileo, and weather satellites.
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// Use Vite proxy to bypass CORS
const CELESTRAK_URL = '/api/celestrak/NORAD/elements/gp.php';
const POLL_INTERVAL_MS = 60_000; // 1 minute (satellites move fast)

// Satellite group queries
const SATELLITE_GROUPS = [
  { name: 'Starlink', group: 'starlink', count: 60 },
  { name: 'OneWeb', group: 'oneweb', count: 30 },
  { name: 'Space Stations', group: 'stations', count: 10 },
  { name: 'GPS', group: 'gps-ops', count: 30 },
  { name: 'Galileo', group: 'galileo', count: 24 },
  { name: 'Weather', group: 'weather', count: 20 },
  { name: 'NOAA', group: 'noaa', count: 15 },
  { name: 'Active', group: 'active', count: 100 },
];

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Simplified SGP4 propagation (using numerical approximation)
// For production, use satellite.js library
interface TLEData {
  name: string;
  line1: string;
  line2: string;
}

interface OrbitalElements {
  satNum: number;
  epochYear: number;
  epochDay: number;
  meanMotion: number; // revs per day
  eccentricity: number;
  inclination: number; // degrees
  raan: number; // degrees
  argPerigee: number; // degrees
  meanAnomaly: number; // degrees
}

function parseTLE(line1: string, line2: string): OrbitalElements | null {
  try {
    return {
      satNum: parseInt(line1.substring(2, 7)),
      epochYear: parseInt(line1.substring(18, 20)),
      epochDay: parseFloat(line1.substring(20, 32)),
      meanMotion: parseFloat(line2.substring(52, 63)),
      eccentricity: parseFloat('0.' + line2.substring(26, 33)),
      inclination: parseFloat(line2.substring(8, 16)),
      raan: parseFloat(line2.substring(17, 25)),
      argPerigee: parseFloat(line2.substring(34, 42)),
      meanAnomaly: parseFloat(line2.substring(43, 51)),
    };
  } catch {
    return null;
  }
}

// Simplified position calculation (mean motion only)
// Full SGP4 implementation would require satellite.js
function calculatePosition(elements: OrbitalElements, date: Date): { lat: number; lon: number; alt: number } | null {
  const GM = 398600.4418; // Earth's gravitational constant km^3/s^2
  const EarthRadius = 6378.137; // km
  
  // Mean motion to semi-major axis
  const n = elements.meanMotion * 2 * Math.PI / 86400; // rad/s
  const a = Math.pow(GM / (n * n), 1/3); // km
  
  // Simple circular orbit approximation
  const period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / GM);
  const elapsed = date.getTime() / 1000 % period;
  const meanAnomaly = (elements.meanAnomaly * Math.PI / 180) + (2 * Math.PI * elapsed / period);
  
  // Simplified - assumes equatorial orbit for demo
  // Real implementation needs full SGP4 with coordinate transformations
  const lat = elements.inclination * Math.sin(meanAnomaly) * Math.PI / 180;
  const lon = (elements.raan + elements.argPerigee + (meanAnomaly * 180 / Math.PI)) % 360;
  const alt = a - EarthRadius;
  
  return {
    lat: lat * 180 / Math.PI,
    lon: lon > 180 ? lon - 360 : lon,
    alt: alt * 1000, // Convert to meters
  };
}

async function fetchTLEData(group: string): Promise<TLEData[]> {
  try {
    const url = `${CELESTRAK_URL}?GROUP=${group}&FORMAT=tle`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[satelliteService] Failed to fetch ${group}:`, res.status);
      return [];
    }
    
    const text = await res.text();
    const lines = text.trim().split('\n');
    const tles: TLEData[] = [];
    
    // Parse 3-line TLE format
    for (let i = 0; i < lines.length; i += 3) {
      if (lines[i] && lines[i + 1] && lines[i + 2]) {
        tles.push({
          name: lines[i].trim(),
          line1: lines[i + 1].trim(),
          line2: lines[i + 2].trim(),
        });
      }
    }
    
    return tles;
  } catch (err) {
    console.error(`[satelliteService] Error fetching ${group}:`, err);
    return [];
  }
}

function generateSatelliteEntity(tle: TLEData, index: number, type: string): Entity | null {
  const elements = parseTLE(tle.line1, tle.line2);
  if (!elements) return null;
  
  const pos = calculatePosition(elements, new Date());
  if (!pos) return null;
  
  return {
    id: `SAT-${type}-${elements.satNum}`,
    label: tle.name.substring(0, 15),
    type: 'satellite',
    provider: 'celestrak',
    position: {
      lat: pos.lat,
      lon: pos.lon,
      alt: pos.alt,
    },
    heading: 0, // Would calculate from velocity vector
    speed: elements.meanMotion * 60, // Rough approximation
    lastSeen: new Date().toISOString(),
    meta: {
      satelliteType: type,
      eccentricity: elements.eccentricity,
      inclination: elements.inclination,
    },
  };
}

async function fetchAllSatellites(): Promise<void> {
  try {
    const allEntities: Entity[] = [];
    
    // Fetch each group
    for (const group of SATELLITE_GROUPS) {
      const tles = await fetchTLEData(group.group);
      // Limit per group for performance
      const limited = tles.slice(0, group.count);
      
      for (let i = 0; i < limited.length; i++) {
        const entity = generateSatelliteEntity(limited[i], i, group.name);
        if (entity) allEntities.push(entity);
      }
    }
    
    if (allEntities.length > 0) {
      const store = useEntityStore.getState();
      // Merge with existing entities, keeping non-satellites
      const existing = Array.from(store.entities.values()).filter(
        e => !e.id.startsWith('SAT-')
      );
      store.upsertEntities([...existing, ...allEntities]);
      console.info(`[satelliteService] Updated ${allEntities.length} satellites`);
    }
  } catch (err) {
    console.error('[satelliteService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchAllSatellites();
  pollTimer = setInterval(fetchAllSatellites, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
