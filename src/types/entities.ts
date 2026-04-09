/**
 * Core entity types for the OSINT platform.
 *
 * Every data source (ADS-B Exchange, MarineTraffic, etc.) normalises its
 * payloads into one of these shapes before dispatching to the global store.
 */

// ---------------------------------------------------------------------------
// Entity domain
// ---------------------------------------------------------------------------

export type EntityType = 'aircraft' | 'vessel' | 'satellite';

export type DataProvider = 'adsb-exchange' | 'marine-traffic' | 'nasa' | 'aprs-fi' | 'opensky' | 'celestrak' | 'usgs' | 'nasa-eonet' | 'gdacs' | 'open-meteo' | 'coingecko' | 'frankfurter';

export interface EntityPosition {
  /** Latitude in decimal degrees (WGS-84). */
  lat: number;
  /** Longitude in decimal degrees (WGS-84). */
  lon: number;
  /** Altitude in metres above mean sea level. Undefined for surface vessels. */
  alt?: number;
}

export interface Entity {
  /** Unique identifier: ICAO hex for aircraft, MMSI for vessels. */
  id: string;
  /** Human-readable label (callsign, vessel name, etc.). */
  label: string;
  type: EntityType;
  provider: DataProvider;
  position: EntityPosition;
  /** Heading in degrees true-north [0..360). */
  heading: number;
  /** Speed in knots. */
  speed: number;
  /** ISO-8601 timestamp of the last position report. */
  lastSeen: string;
  /** Optional extra metadata from the source API. */
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Trail / historical track
// ---------------------------------------------------------------------------

export interface TrailPoint {
  lat: number;
  lon: number;
  alt?: number;
  /** ISO-8601 timestamp. */
  ts: string;
}

export type EntityTrail = TrailPoint[];

// ---------------------------------------------------------------------------
// Fusion results
// ---------------------------------------------------------------------------

export type FusionRelationType = 'proximity' | 'temporal' | 'escort' | 'rendezvous';

export interface FusionRelation {
  /** IDs of the entities involved. */
  entityIds: [string, string];
  type: FusionRelationType;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** Human-readable description. */
  description: string;
  /** ISO-8601 timestamp when the relation was detected. */
  detectedAt: string;
}

export interface FusionResult {
  relations: FusionRelation[];
  /** Total entities processed in this fusion pass. */
  entityCount: number;
  /** Duration of the fusion computation in milliseconds. */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ServiceStatus {
  provider: DataProvider;
  status: ConnectionStatus;
  /** Last error message, if any. */
  error?: string;
  /** ISO-8601 timestamp of last successful message. */
  lastMessageAt?: string;
}
