/**
 * Cyber Threat Intelligence service via abuse.ch URLhaus
 * 
 * FREE, no API key required
 * Tracks malware distribution sites globally - significant for security monitoring
 * 
 * Provides: malicious URL distribution centers, C2 servers, threat actor infrastructure
 */

import type { GeoEvent } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

const URLHAUS_API = 'https://urlhaus-api.abuse.ch/v1/urls/recent/';
const POLL_INTERVAL_MS = 600_000; // 10 minutes - threat data doesn't change as fast

let pollTimer: ReturnType<typeof setInterval> | null = null;

interface URLhausEntry {
  id: string;
  urlhaus_reference: string;
  url: string;
  url_status: string;
  threat: string;
  tags: string[];
  url_type: string;
  reporter: string;
  date_added: string;
  url_type_title?: string;
}

async function fetchThreatData(): Promise<void> {
  try {
    const res = await fetch(URLHAUS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }), // Get recent 50 threats
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (!data.urls || !Array.isArray(data.urls)) return;
    
    // Convert to geo events (note: URLhaus doesn't provide geo, 
    // so we tag as global cyber events)
    const events: GeoEvent[] = data.urls.slice(0, 20).map((entry: URLhausEntry) => ({
      id: `threat-${entry.id}`,
      title: `Malware: ${entry.threat}`,
      type: 'storm', // Using storm as generic alert type
      lat: 0, // No geo available in URLhaus
      lon: 0,
      timestamp: entry.date_added,
      severity: entry.threat.includes('botnet') ? 'critical' : 
                entry.threat.includes('trojan') ? 'high' : 'medium',
      source: 'abuse.ch URLhaus',
      url: entry.urlhaus_reference,
      meta: {
        threatType: entry.threat,
        url: entry.url,
        tags: entry.tags,
        reporter: entry.reporter,
        status: entry.url_status,
      },
    }));
    
    if (events.length > 0) {
      const store = useGlobalEventsStore.getState();
      store.setGeoEvents('threat', events);
      console.info(`[threatIntelService] Updated ${events.length} threat indicators`);
    }
  } catch (err) {
    console.error('[threatIntelService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchThreatData();
  pollTimer = setInterval(fetchThreatData, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
