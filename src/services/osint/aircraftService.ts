/**
 * Aircraft OSINT data service.
 *
 * Connects to the ADS-B Exchange rapid-update API via WebSocket and
 * normalises incoming flight telemetry into the platform's Entity model.
 *
 * Configuration is pulled from environment variables:
 *   VITE_ADSB_WS_URL  - WebSocket endpoint (default: wss://...)
 *   VITE_ADSB_API_KEY  - API key for authenticated access
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WS_URL =
  import.meta.env.VITE_ADSB_WS_URL ??
  'wss://opendata.adsb.fi/api/v2/websocket';

const API_KEY = import.meta.env.VITE_ADSB_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Reconnect parameters (exponential back-off)
// ---------------------------------------------------------------------------

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const BACKOFF_FACTOR = 2;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

let socket: WebSocket | null = null;
let retryMs = INITIAL_RETRY_MS;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Parse a raw ADS-B JSON message into an Entity.
 *
 * The exact shape varies between providers; this implementation follows the
 * common fields found in adsbexchange / opendata.adsb.fi feeds.
 */
function parseAdsbMessage(raw: Record<string, unknown>): Entity | null {
  const hex = raw.hex as string | undefined;
  const lat = raw.lat as number | undefined;
  const lon = raw.lon as number | undefined;

  if (!hex || lat === undefined || lon === undefined) return null;

  return {
    id: hex,
    label: (raw.flight as string | undefined)?.trim() ?? hex,
    type: 'aircraft',
    provider: 'adsb-exchange',
    position: {
      lat,
      lon,
      alt: (raw.alt_baro as number | undefined) ?? (raw.alt_geom as number | undefined),
    },
    heading: (raw.track as number | undefined) ?? 0,
    speed: (raw.gs as number | undefined) ?? 0,
    lastSeen: new Date().toISOString(),
    meta: {
      squawk: raw.squawk,
      category: raw.category,
      emergency: raw.emergency,
      registration: raw.r,
      aircraftType: raw.t,
    },
  };
}

function onMessage(event: MessageEvent): void {
  try {
    const data = JSON.parse(event.data as string) as Record<string, unknown>;
    const aircraft = (data.ac ?? data.aircraft ?? [data]) as Record<string, unknown>[];
    const store = useEntityStore.getState();

    const entities: Entity[] = [];
    for (const ac of aircraft) {
      const entity = parseAdsbMessage(ac);
      if (entity) {
        entities.push(entity);
        store.appendTrail(entity.id, {
          lat: entity.position.lat,
          lon: entity.position.lon,
          alt: entity.position.alt,
          ts: entity.lastSeen,
        });
      }
    }

    if (entities.length > 0) {
      store.upsertEntities(entities);
      store.setServiceStatus('adsb-exchange', 'connected');
    }
  } catch (err) {
    console.error('[aircraftService] Failed to parse message:', err);
  }
}

function scheduleReconnect(): void {
  if (retryTimer) return;
  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'connecting');

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connect();
  }, retryMs);

  retryMs = Math.min(retryMs * BACKOFF_FACTOR, MAX_RETRY_MS);
}

/**
 * Open a WebSocket connection to the ADS-B feed.
 */
export function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'connecting');

  const url = API_KEY ? `${WS_URL}?apikey=${API_KEY}` : WS_URL;

  try {
    socket = new WebSocket(url);
  } catch (err) {
    console.error('[aircraftService] Failed to create WebSocket:', err);
    store.setServiceStatus('adsb-exchange', 'error', String(err));
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    retryMs = INITIAL_RETRY_MS;
    store.setServiceStatus('adsb-exchange', 'connected');
    console.info('[aircraftService] Connected to ADS-B feed');
  };

  socket.onmessage = onMessage;

  socket.onerror = (ev) => {
    console.error('[aircraftService] WebSocket error:', ev);
    store.setServiceStatus('adsb-exchange', 'error', 'WebSocket error');
  };

  socket.onclose = () => {
    console.warn('[aircraftService] Connection closed, scheduling reconnect');
    store.setServiceStatus('adsb-exchange', 'disconnected');
    scheduleReconnect();
  };
}

/**
 * Gracefully tear down the WebSocket connection.
 */
export function disconnect(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (socket) {
    socket.onclose = null; // prevent auto-reconnect
    socket.close();
    socket = null;
  }
  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'disconnected');
}
