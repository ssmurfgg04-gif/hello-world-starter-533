/**
 * Maritime OSINT data service.
 *
 * Connects to an AIS WebSocket feed (e.g. AISstream.io or similar public
 * provider) and normalises vessel telemetry into the platform's Entity model.
 *
 * Configuration is pulled from environment variables:
 *   VITE_AIS_WS_URL   - WebSocket endpoint
 *   VITE_AIS_API_KEY   - API key for authenticated access
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WS_URL =
  import.meta.env.VITE_AIS_WS_URL ??
  'wss://stream.aisstream.io/v0/stream';

const API_KEY = import.meta.env.VITE_AIS_API_KEY ?? '';

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
 * Parse a raw AIS JSON message into an Entity.
 */
function parseAisMessage(raw: Record<string, unknown>): Entity | null {
  // AISstream.io format
  const msg = (raw.Message as Record<string, unknown>) ?? raw;
  const posReport =
    (msg.PositionReport as Record<string, unknown>) ??
    (msg.position_report as Record<string, unknown>) ??
    msg;

  const meta = (raw.MetaData as Record<string, unknown>) ?? {};
  const mmsi = String(meta.MMSI ?? raw.mmsi ?? raw.UserID ?? posReport.UserID ?? '');

  const lat =
    (posReport.Latitude as number | undefined) ??
    (posReport.lat as number | undefined);
  const lon =
    (posReport.Longitude as number | undefined) ??
    (posReport.lon as number | undefined);

  if (!mmsi || lat === undefined || lon === undefined) return null;

  return {
    id: mmsi,
    label: (meta.ShipName as string | undefined)?.trim() ?? mmsi,
    type: 'vessel',
    provider: 'marine-traffic',
    position: { lat, lon },
    heading:
      (posReport.TrueHeading as number | undefined) ??
      (posReport.Cog as number | undefined) ??
      0,
    speed: (posReport.Sog as number | undefined) ?? 0,
    lastSeen: new Date().toISOString(),
    meta: {
      shipType: meta.ShipType,
      destination: meta.Destination,
      imo: meta.IMO,
      flag: meta.Flag,
      navigationStatus: posReport.NavigationalStatus,
    },
  };
}

function onMessage(event: MessageEvent): void {
  try {
    const data = JSON.parse(event.data as string) as Record<string, unknown>;
    const store = useEntityStore.getState();

    const entity = parseAisMessage(data);
    if (entity) {
      store.upsertEntities([entity]);
      store.appendTrail(entity.id, {
        lat: entity.position.lat,
        lon: entity.position.lon,
        ts: entity.lastSeen,
      });
      store.setServiceStatus('marine-traffic', 'connected');
    }
  } catch (err) {
    console.error('[maritimeService] Failed to parse message:', err);
  }
}

function scheduleReconnect(): void {
  if (retryTimer) return;
  const store = useEntityStore.getState();
  store.setServiceStatus('marine-traffic', 'connecting');

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connect();
  }, retryMs);

  retryMs = Math.min(retryMs * BACKOFF_FACTOR, MAX_RETRY_MS);
}

/**
 * Build the subscription message required by AISstream.io.
 * Subscribes to a bounding box covering the entire globe by default.
 */
function buildSubscription(): string {
  return JSON.stringify({
    APIKey: API_KEY,
    BoundingBoxes: [[[-90, -180], [90, 180]]],
    FilterMessageTypes: ['PositionReport'],
  });
}

/**
 * Open a WebSocket connection to the AIS feed.
 */
export function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const store = useEntityStore.getState();
  store.setServiceStatus('marine-traffic', 'connecting');

  try {
    socket = new WebSocket(WS_URL);
  } catch (err) {
    console.error('[maritimeService] Failed to create WebSocket:', err);
    store.setServiceStatus('marine-traffic', 'error', String(err));
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    retryMs = INITIAL_RETRY_MS;
    store.setServiceStatus('marine-traffic', 'connected');
    console.info('[maritimeService] Connected to AIS feed');

    // Send subscription payload
    if (API_KEY) {
      socket?.send(buildSubscription());
    }
  };

  socket.onmessage = onMessage;

  socket.onerror = (ev) => {
    console.error('[maritimeService] WebSocket error:', ev);
    store.setServiceStatus('marine-traffic', 'error', 'WebSocket error');
  };

  socket.onclose = () => {
    console.warn('[maritimeService] Connection closed, scheduling reconnect');
    store.setServiceStatus('marine-traffic', 'disconnected');
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
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  const store = useEntityStore.getState();
  store.setServiceStatus('marine-traffic', 'disconnected');
}
