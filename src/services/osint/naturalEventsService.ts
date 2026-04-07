/**
 * NASA EONET (Earth Observatory Natural Event Tracker) API.
 *
 * FREE, no API key, no signup required.
 * https://eonet.gsfc.nasa.gov/docs/v3
 *
 * Fetches active natural events: wildfires, storms, volcanoes, icebergs, etc.
 */

import type { GeoEvent, GeoEventType } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

const API_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';
const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes

let pollTimer: ReturnType<typeof setInterval> | null = null;

const CATEGORY_MAP: Record<string, GeoEventType> = {
  wildfires: 'wildfire',
  volcanoes: 'volcano',
  severeStorms: 'storm',
  floods: 'flood',
  seaLakeIce: 'iceberg',
  dustHaze: 'dust_haze',
  drought: 'drought',
};

function mapCategory(categories: Array<{ id: string }>): GeoEventType {
  for (const cat of categories) {
    if (CATEGORY_MAP[cat.id]) return CATEGORY_MAP[cat.id];
  }
  return 'storm'; // fallback
}

async function fetchEvents(): Promise<void> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return;

    const data = await res.json() as {
      events: Array<{
        id: string;
        title: string;
        categories: Array<{ id: string; title: string }>;
        geometry: Array<{ date: string; coordinates: [number, number] }>;
        sources: Array<{ url: string }>;
      }>;
    };

    const events: GeoEvent[] = [];

    for (const e of data.events) {
      const geo = e.geometry[e.geometry.length - 1]; // latest position
      if (!geo) continue;

      events.push({
        id: `eonet-${e.id}`,
        title: e.title,
        type: mapCategory(e.categories),
        lon: geo.coordinates[0],
        lat: geo.coordinates[1],
        timestamp: geo.date,
        severity: 'medium',
        source: 'NASA EONET',
        url: e.sources[0]?.url,
        meta: {
          categories: e.categories.map((c) => c.title),
          positionCount: e.geometry.length,
        },
      });
    }

    useGlobalEventsStore.getState().setGeoEvents('natural', events);
    console.info(`[naturalEventsService] ${events.length} active natural events`);
  } catch (err) {
    console.error('[naturalEventsService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchEvents();
  pollTimer = setInterval(fetchEvents, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
