/**
 * AI Analysis Engine -- Pattern recognition, anomaly detection, and predictions.
 *
 * This is a rule-based intelligence engine that analyses the full state of
 * all data sources and generates human-readable insights. It runs entirely
 * in the browser with no external AI API required.
 *
 * Analysis categories:
 *   - Traffic density anomalies (unusual concentrations)
 *   - Speed/heading anomalies (entities behaving unusually)
 *   - Proximity alerts (entities converging in sensitive zones)
 *   - Market correlation (price moves correlated with geopolitical events)
 *   - Natural event impact assessment
 *   - Predictive alerts based on historical patterns
 */

import type { Entity } from '@/types/entities';
import type { GeoEvent, MarketTicker, AnalysisInsight } from '@/types/events';
import { useEntityStore } from '@/store/entityStore';
import { useGlobalEventsStore } from '@/store/globalEventsStore';
import { haversineKm } from '@/lib/geo';

const ANALYSIS_INTERVAL_MS = 15_000;
let analysisTimer: ReturnType<typeof setInterval> | null = null;
let runCount = 0;

// ---------------------------------------------------------------------------
// Analysis functions
// ---------------------------------------------------------------------------

function analyseTrafficDensity(entities: Entity[]): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const now = new Date().toISOString();

  // Grid-based density analysis (5-degree cells)
  const grid: Map<string, Entity[]> = new Map();
  for (const e of entities) {
    const cellKey = `${Math.floor(e.position.lat / 5) * 5},${Math.floor(e.position.lon / 5) * 5}`;
    const cell = grid.get(cellKey) ?? [];
    cell.push(e);
    grid.set(cellKey, cell);
  }

  for (const [key, cell] of grid) {
    if (cell.length > 20) {
      const [lat, lon] = key.split(',').map(Number);
      const aircraft = cell.filter((e) => e.type === 'aircraft').length;
      const vessels = cell.filter((e) => e.type === 'vessel').length;

      insights.push({
        id: `density-${key}-${runCount}`,
        type: 'pattern',
        severity: cell.length > 50 ? 'warning' : 'info',
        title: `High traffic density near ${lat}N, ${lon}E`,
        description: `${cell.length} entities detected: ${aircraft} aircraft, ${vessels} vessels. This area shows above-average activity.`,
        confidence: Math.min(cell.length / 100, 0.95),
        timestamp: now,
      });
    }
  }

  return insights;
}

function analyseSpeedAnomalies(entities: Entity[]): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const now = new Date().toISOString();

  for (const e of entities) {
    // Stationary aircraft at altitude (potential surveillance)
    if (e.type === 'aircraft' && e.speed < 50 && e.position.alt && e.position.alt > 2000) {
      insights.push({
        id: `loiter-${e.id}-${runCount}`,
        type: 'anomaly',
        severity: 'warning',
        title: `Possible loitering aircraft: ${e.label}`,
        description: `${e.label} is moving at only ${e.speed.toFixed(0)} kts at ${e.position.alt.toFixed(0)}m altitude. This pattern is consistent with surveillance or search operations.`,
        entities: [e.id],
        confidence: 0.6,
        timestamp: now,
      });
    }

    // Fast-moving vessel (potential military)
    if (e.type === 'vessel' && e.speed > 25) {
      insights.push({
        id: `fast-vessel-${e.id}-${runCount}`,
        type: 'anomaly',
        severity: 'info',
        title: `High-speed vessel: ${e.label}`,
        description: `${e.label} is moving at ${e.speed.toFixed(1)} kts, significantly above typical commercial shipping speeds (12-16 kts).`,
        entities: [e.id],
        confidence: 0.7,
        timestamp: now,
      });
    }
  }

  return insights;
}

function analyseNearEvents(entities: Entity[], geoEvents: GeoEvent[]): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const now = new Date().toISOString();

  for (const event of geoEvents) {
    if (event.type !== 'earthquake' || !event.magnitude || event.magnitude < 5) continue;

    const nearbyEntities: string[] = [];
    for (const e of entities) {
      const dist = haversineKm(e.position.lat, e.position.lon, event.lat, event.lon);
      if (dist < 200) {
        nearbyEntities.push(e.id);
      }
    }

    if (nearbyEntities.length > 0) {
      insights.push({
        id: `quake-impact-${event.id}-${runCount}`,
        type: 'alert',
        severity: 'critical',
        title: `M${event.magnitude.toFixed(1)} earthquake near ${nearbyEntities.length} tracked entities`,
        description: `${event.title}. ${nearbyEntities.length} aircraft/vessels are within 200km of the epicenter.`,
        entities: nearbyEntities.slice(0, 10),
        confidence: 0.9,
        timestamp: now,
      });
    }
  }

  return insights;
}

function analyseMarketCorrelation(tickers: MarketTicker[], geoEvents: GeoEvent[]): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  const now = new Date().toISOString();

  // Check for major market moves coinciding with critical events
  const criticalEvents = geoEvents.filter((e) => e.severity === 'critical');
  const majorMoves = tickers.filter((t) => Math.abs(t.changePercent24h) > 5);

  if (criticalEvents.length > 0 && majorMoves.length > 0) {
    insights.push({
      id: `market-geo-corr-${runCount}`,
      type: 'pattern',
      severity: 'warning',
      title: 'Potential market-geopolitical correlation detected',
      description: `${criticalEvents.length} critical geo events and ${majorMoves.length} significant market moves (>5%) detected simultaneously. Tickers: ${majorMoves.map((t) => `${t.symbol.toUpperCase()} ${t.changePercent24h > 0 ? '+' : ''}${t.changePercent24h.toFixed(1)}%`).join(', ')}`,
      confidence: 0.5,
      timestamp: now,
    });
  }

  return insights;
}

function generateSummary(
  entityCount: number,
  eventCount: number,
  tickerCount: number,
  insightCount: number,
): AnalysisInsight {
  return {
    id: `summary-${runCount}`,
    type: 'summary',
    severity: 'info',
    title: 'Global Intelligence Summary',
    description: `Monitoring ${entityCount} entities (aircraft + vessels), ${eventCount} natural events, ${tickerCount} market tickers. ${insightCount} active insights detected this cycle.`,
    confidence: 1,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main analysis loop
// ---------------------------------------------------------------------------

function runAnalysis(): void {
  runCount++;
  const entities = Array.from(useEntityStore.getState().entities.values());
  const { allGeoEvents, marketTickers } = useGlobalEventsStore.getState();

  const insights: AnalysisInsight[] = [];

  insights.push(...analyseTrafficDensity(entities));
  insights.push(...analyseSpeedAnomalies(entities));
  insights.push(...analyseNearEvents(entities, allGeoEvents));
  insights.push(...analyseMarketCorrelation(marketTickers, allGeoEvents));

  // Add summary as first insight
  insights.unshift(generateSummary(
    entities.length,
    allGeoEvents.length,
    marketTickers.length,
    insights.length,
  ));

  useGlobalEventsStore.getState().setInsights(insights);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startAnalysis(): void {
  if (analysisTimer) return;
  console.info('[aiAnalysisEngine] Starting analysis loop (15s interval)');
  runAnalysis();
  analysisTimer = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
}

export function stopAnalysis(): void {
  if (analysisTimer) { clearInterval(analysisTimer); analysisTimer = null; }
}
