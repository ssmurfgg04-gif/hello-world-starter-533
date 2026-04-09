/**
 * APRS (Amateur Packet Reporting System) data service via aprs.fi API
 * 
 * FREE API key required (get at https://aprs.fi/page/api)
 * Tracks amateur radio stations, weather balloons, vehicles, and maritime
 * 
 * Significant for: emergency response tracking, weather balloon data, 
 * ground vehicle positions, and maritime backup
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

const API_BASE = 'https://api.aprs.fi/api/v1';
const API_KEY = import.meta.env.VITE_APRS_API_KEY ?? '';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollTimer: ReturnType<typeof setInterval> | null = null;

// High-priority station prefixes to track (emergency, weather, significant)
const STATION_PREFIXES = [
  'KJ4', 'N0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', // US
  'DB0', 'DL', 'DO', 'F', 'G', 'I', 'JA', 'ON', 'PA', 'VE', 'VK',     // Europe/World
];

interface APRSEntry {
  name: string;
  lat: number;
  lng: number;
  alt?: number;
  speed?: number;
  course?: number;
  symbol?: string;
  type?: string;
  comment?: string;
  lasttime?: number;
  status?: string;
}

function parseStation(entry: APRSEntry): Entity | null {
  if (!entry.lat || !entry.lng || !entry.name) return null;
  
  // Determine type based on symbol and name
  let type: 'aircraft' | 'vessel' | 'ground' = 'ground';
  if (entry.symbol?.includes('Balloon') || entry.comment?.toLowerCase().includes('wx')) {
    type = 'aircraft'; // Weather balloons go high
  } else if (entry.symbol?.includes('Ship') || entry.name.startsWith('MMSI')) {
    type = 'vessel';
  }
  
  return {
    id: `APRS-${entry.name}`,
    label: entry.name,
    type,
    provider: 'aprs.fi',
    position: {
      lat: entry.lat,
      lon: entry.lng,
      alt: entry.alt,
    },
    heading: entry.course ?? 0,
    speed: (entry.speed ?? 0) / 1.852, // km/h to knots
    lastSeen: new Date((entry.lasttime ?? Date.now() / 1000) * 1000).toISOString(),
    meta: {
      symbol: entry.symbol,
      comment: entry.comment,
      status: entry.status,
      aprsType: entry.type,
    },
  };
}

async function fetchAPRSData(): Promise<void> {
  if (!API_KEY) {
    console.warn('[aprsService] No VITE_APRS_API_KEY - APRS tracking disabled');
    return;
  }
  
  try {
    // Fetch latest positions
    const url = `${API_BASE}/loc?name=${STATION_PREFIXES.join(',')}&what=loc&apikey=${API_KEY}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (data.entries) {
      const entries: APRSEntry[] = Array.isArray(data.entries) ? data.entries : [data.entries];
      const entities = entries.map(parseStation).filter(Boolean) as Entity[];
      
      if (entities.length > 0) {
        const store = useEntityStore.getState();
        store.upsertEntities(entities);
        store.setServiceStatus('aprs-fi', 'connected');
        console.info(`[aprsService] Updated ${entities.length} APRS stations`);
      }
    }
  } catch (err) {
    console.error('[aprsService] Fetch failed:', err);
    useEntityStore.getState().setServiceStatus('aprs-fi', 'error', String(err));
  }
}

export function connect(): void {
  if (pollTimer) return;
  if (!API_KEY) {
    console.info('[aprsService] VITE_APRS_API_KEY not set - APRS disabled (get free key at aprs.fi)');
    return;
  }
  fetchAPRSData();
  pollTimer = setInterval(fetchAPRSData, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
