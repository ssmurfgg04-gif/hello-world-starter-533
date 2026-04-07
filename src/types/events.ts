/**
 * Extended event types for the OSINT platform.
 * Covers natural events, market data, and intelligence events.
 */

// ---------------------------------------------------------------------------
// Natural events (USGS, NASA EONET)
// ---------------------------------------------------------------------------

export interface GeoEvent {
  id: string;
  title: string;
  type: GeoEventType;
  lat: number;
  lon: number;
  timestamp: string;
  magnitude?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  url?: string;
  meta?: Record<string, unknown>;
}

export type GeoEventType =
  | 'earthquake'
  | 'volcano'
  | 'wildfire'
  | 'storm'
  | 'flood'
  | 'iceberg'
  | 'drought'
  | 'dust_haze';

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

export interface MarketTicker {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
}

export interface MarketAlert {
  id: string;
  symbol: string;
  type: 'spike' | 'crash' | 'volume_surge' | 'breakout';
  message: string;
  changePercent: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// AI Analysis
// ---------------------------------------------------------------------------

export interface AnalysisInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'alert' | 'summary';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  entities?: string[];
  confidence: number;
  timestamp: string;
}
