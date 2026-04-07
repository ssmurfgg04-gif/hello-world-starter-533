/**
 * USGS Earthquake Hazards Program API.
 *
 * FREE, no API key, no signup required.
 * https://earthquake.usgs.gov/fdsnws/event/1/
 *
 * Fetches significant earthquakes from the last 24 hours globally.
 */

import type { GeoEvent } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

const API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const POLL_INTERVAL_MS = 60_000; // 1 minute

let pollTimer: ReturnType<typeof setInterval> | null = null;

function severityFromMag(mag: number): GeoEvent['severity'] {
  if (mag >= 7) return 'critical';
  if (mag >= 5.5) return 'high';
  if (mag >= 4) return 'medium';
  return 'low';
}

async function fetchEarthquakes(): Promise<void> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return;

    const data = await res.json() as {
      features: Array<{
        id: string;
        properties: {
          mag: number;
          place: string;
          time: number;
          url: string;
          title: string;
          alert?: string;
          tsunami?: number;
        };
        geometry: { coordinates: [number, number, number] };
      }>;
    };

    const events: GeoEvent[] = data.features.map((f) => ({
      id: `eq-${f.id}`,
      title: f.properties.title,
      type: 'earthquake' as const,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      timestamp: new Date(f.properties.time).toISOString(),
      magnitude: f.properties.mag,
      severity: severityFromMag(f.properties.mag),
      source: 'USGS',
      url: f.properties.url,
      meta: {
        place: f.properties.place,
        depth_km: f.geometry.coordinates[2],
        tsunami: f.properties.tsunami === 1,
        alert: f.properties.alert,
      },
    }));

    useGlobalEventsStore.getState().setGeoEvents('earthquake', events);
    console.info(`[earthquakeService] ${events.length} earthquakes (M2.5+, 24h)`);
  } catch (err) {
    console.error('[earthquakeService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchEarthquakes();
  pollTimer = setInterval(fetchEarthquakes, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
