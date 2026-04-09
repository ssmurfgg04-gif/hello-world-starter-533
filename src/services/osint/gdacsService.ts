/**
 * GDACS (Global Disaster Alert and Coordination System) alerts.
 * 
 * FREE RSS feed, no API key required.
 * https://www.gdacs.org/
 * 
 * Provides real-time disaster alerts including earthquakes, tsunamis,
 * tropical cyclones, floods, and volcanoes.
 */

import type { GeoEvent } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

const RSS_URL = 'https://www.gdacs.org/xml/rss.xml';
const POLL_INTERVAL_MS = 300_000; // 5 minutes

let pollTimer: ReturnType<typeof setInterval> | null = null;

interface GDACSEntry {
  title: string;
  link: string;
  pubDate: string;
  'geo:lat'?: string;
  'geo:long'?: string;
  'gdacs:severity'?: { _: string };
  'gdacs:eventtype'?: { _: string };
  'gdacs:country'?: { _: string };
}

function parseSeverity(gdacsSeverity: string | undefined): 'low' | 'medium' | 'high' | 'critical' {
  if (!gdacsSeverity) return 'medium';
  const s = gdacsSeverity.toLowerCase();
  if (s.includes('red')) return 'critical';
  if (s.includes('orange')) return 'high';
  if (s.includes('green')) return 'low';
  return 'medium';
}

function parseEventType(gdacsType: string | undefined): GeoEvent['type'] {
  if (!gdacsType) return 'storm';
  const t = gdacsType.toLowerCase();
  if (t.includes('earthquake')) return 'earthquake';
  if (t.includes('tsunami')) return 'flood';
  if (t.includes('cyclone') || t.includes('storm')) return 'storm';
  if (t.includes('flood')) return 'flood';
  if (t.includes('volcano')) return 'volcano';
  if (t.includes('drought')) return 'drought';
  if (t.includes('fire')) return 'wildfire';
  return 'storm';
}

function parseMagnitude(title: string): number | undefined {
  const match = title.match(/M([\d.]+)/);
  return match ? parseFloat(match[1]) : undefined;
}

function parseWindSpeed(title: string): number | undefined {
  const match = title.match(/(\d+)\s*km\/h/i);
  return match ? parseFloat(match[1]) : undefined;
}

async function fetchGDACS(): Promise<void> {
  try {
    // Using a CORS proxy or direct fetch
    const res = await fetch(RSS_URL);
    if (!res.ok) {
      console.warn('[gdacsService] RSS fetch failed:', res.status);
      return;
    }
    
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    
    const items = xml.querySelectorAll('item');
    const events: GeoEvent[] = [];
    
    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent ?? 'Unknown';
      const link = item.querySelector('link')?.textContent ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent ?? new Date().toISOString();
      
      // Try to find geo coordinates
      let lat: number | null = null;
      let lon: number | null = null;
      
      const latEl = item.querySelector('lat') || item.querySelector('geo\\:lat');
      const lonEl = item.querySelector('long') || item.querySelector('geo\\:long');
      
      if (latEl) lat = parseFloat(latEl.textContent ?? '0');
      if (lonEl) lon = parseFloat(lonEl.textContent ?? '0');
      
      // Skip if no coordinates
      if (!lat || !lon) return;
      
      // Extract GDACS-specific fields
      const severityEl = item.querySelector('gdacs\\:severity, severity');
      const eventTypeEl = item.querySelector('gdacs\\:eventtype, eventtype');
      
      const severity = parseSeverity(severityEl?.textContent ?? undefined);
      const eventType = parseEventType(eventTypeEl?.textContent ?? undefined);
      const magnitude = parseMagnitude(title);
      const windSpeed = parseWindSpeed(title);
      
      const event: GeoEvent = {
        id: `gdacs-${Date.now()}-${events.length}`,
        title,
        type: eventType,
        lat,
        lon,
        timestamp: new Date(pubDate).toISOString(),
        severity,
        source: 'GDACS',
        url: link,
        magnitude,
        meta: {
          windSpeed,
          rawTitle: title,
        },
      };
      
      events.push(event);
    });
    
    if (events.length > 0) {
      const store = useGlobalEventsStore.getState();
      store.setGeoEvents('gdacs', events);
      console.info(`[gdacsService] Updated ${events.length} disaster alerts`);
    }
  } catch (err) {
    console.error('[gdacsService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchGDACS();
  pollTimer = setInterval(fetchGDACS, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
