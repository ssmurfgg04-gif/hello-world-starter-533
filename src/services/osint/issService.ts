/**
 * NASA ISS (International Space Station) tracking service
 * 
 * FREE, no API key required
 * Uses NASA Open Notify API for real-time ISS position
 * 
 * Significant for: space station monitoring, crew tracking, 
 * orbital pattern analysis, educational value
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// Use Vite proxy to bypass CORS
const ISS_API_URL = '/api/iss/iss-now.json';
const ASTRONAUTS_URL = 'https://api.open-notify.org/astros.json';
const POLL_INTERVAL_MS = 5_000; // 5 seconds - ISS moves fast

let pollTimer: ReturnType<typeof setInterval> | null = null;

interface ISSPosition {
  message: string;
  timestamp: number;
  iss_position: {
    latitude: string;
    longitude: string;
  };
}

interface Astronauts {
  message: string;
  number: number;
  people: Array<{
    name: string;
    craft: string;
  }>;
}

async function fetchISSPosition(): Promise<void> {
  try {
    // Get ISS position
    const res = await fetch(ISS_API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data: ISSPosition = await res.json();
    if (data.message !== 'success') throw new Error('API error');
    
    // Get astronauts (optional, for metadata)
    let astroCount = 0;
    try {
      const astroRes = await fetch(ASTRONAUTS_URL);
      if (astroRes.ok) {
        const astroData: Astronauts = await astroRes.json();
        astroCount = astroData.number;
      }
    } catch {
      // Non-critical, continue
    }
    
    const entity: Entity = {
      id: 'ISS-ZARYA',
      label: 'ISS - International Space Station',
      type: 'aircraft',
      provider: 'nasa',
      position: {
        lat: parseFloat(data.iss_position.latitude),
        lon: parseFloat(data.iss_position.longitude),
        alt: 408000, // ISS orbits at ~408 km
      },
      heading: 0, // Would need calculation from velocity vector
      speed: 27600, // km/h orbital speed - shown in knots equivalent
      lastSeen: new Date(data.timestamp * 1000).toISOString(),
      meta: {
        craft: 'ISS',
        mission: 'Expedition 71',
        crewCount: astroCount,
        altitude: '408 km',
        orbitalPeriod: '90 min',
        visibility: 'Visible from Earth every 90 min',
      },
    };
    
    const store = useEntityStore.getState();
    store.upsertEntities([entity]);
    store.setServiceStatus('nasa-iss', 'connected');
    
  } catch (err) {
    console.error('[issService] Fetch failed:', err);
    useEntityStore.getState().setServiceStatus('nasa-iss', 'error', String(err));
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchISSPosition();
  pollTimer = setInterval(fetchISSPosition, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
