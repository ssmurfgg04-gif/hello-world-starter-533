/**
 * Alert Notifications Panel
 * Shows real-time alerts for disasters, market movements, and anomalies
 */

import { useState, useEffect } from 'react';
import { useGlobalEventsStore } from '@/store/globalEventsStore';
import { useEntityStore } from '@/store/entityStore';
import type { GeoEvent, MarketAlert, AnalysisInsight } from '@/types/events';

interface Alert {
  id: string;
  type: 'disaster' | 'market' | 'fusion' | 'weather';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  location?: { lat: number; lon: number };
}

export function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const geoEvents = useGlobalEventsStore((s) => s.allGeoEvents);
  const marketAlerts = useGlobalEventsStore((s) => s.marketAlerts);
  const insights = useGlobalEventsStore((s) => s.insights);
  const relations = useEntityStore((s) => s.relations);

  // Generate alerts from various sources
  useEffect(() => {
    const newAlerts: Alert[] = [];

    // Disaster alerts from geo events
    geoEvents
      .filter((e) => e.severity === 'high' || e.severity === 'critical')
      .forEach((e) => {
        newAlerts.push({
          id: `disaster-${e.id}`,
          type: 'disaster',
          severity: e.severity,
          title: e.title,
          message: `${e.type.toUpperCase()} - ${e.source}`,
          timestamp: e.timestamp,
          location: { lat: e.lat, lon: e.lon },
        });
      });

    // Market alerts
    marketAlerts.slice(0, 5).forEach((a) => {
      newAlerts.push({
        id: `market-${a.id}`,
        type: 'market',
        severity: a.type === 'crash' ? 'critical' : a.type === 'spike' ? 'high' : 'medium',
        title: `${a.symbol} ${a.type}`,
        message: a.message,
        timestamp: a.timestamp,
      });
    });

    // Fusion alerts (proximity detections)
    relations
      .filter((r) => r.confidence > 0.7)
      .slice(0, 5)
      .forEach((r, i) => {
        newAlerts.push({
          id: `fusion-${i}`,
          type: 'fusion',
          severity: r.confidence > 0.9 ? 'critical' : 'high',
          title: 'Proximity Alert',
          message: `${r.description} (confidence: ${(r.confidence * 100).toFixed(0)}%)`,
          timestamp: new Date().toISOString(),
        });
      });

    // AI insights that are warnings or critical
    insights
      .filter((i) => i.severity !== 'info')
      .slice(0, 5)
      .forEach((i) => {
        newAlerts.push({
          id: `insight-${i.id}`,
          type: 'fusion',
          severity: i.severity === 'warning' ? 'high' : i.severity === 'critical' ? 'critical' : 'medium',
          title: i.title,
          message: i.description,
          timestamp: i.timestamp,
        });
      });

    // Sort by severity and timestamp
    const sorted = newAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setAlerts((prev) => {
      const newAlerts = sorted.slice(0, 20);
      const newUnread = newAlerts.filter((a) => !prev.find((ea) => ea.id === a.id)).length;
      setUnreadCount(newUnread);
      return newAlerts;
    });
  }, [geoEvents, marketAlerts, insights, relations]);

  const severityColors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-amber-400 text-black',
    low: 'bg-blue-400 text-white',
  };

  const typeIcons = {
    disaster: '🌋',
    market: '📈',
    fusion: '🔗',
    weather: '🌪️',
  };

  if (alerts.length === 0) {
    return (
      <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-green-400 backdrop-blur">
          <span>✓</span>
          <span>All systems normal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2">
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          setUnreadCount(0);
        }}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium backdrop-blur transition-all ${
          unreadCount > 0
            ? 'animate-pulse bg-red-600 text-white'
            : 'bg-black/70 text-amber-400 hover:bg-black/80'
        }`}
      >
        <span>🔔</span>
        <span>
          {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
          {unreadCount > 0 && ` (${unreadCount} new)`}
        </span>
        <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="absolute top-full mt-2 max-h-80 w-80 overflow-y-auto rounded-lg border border-white/20 bg-black/90 shadow-2xl backdrop-blur">
          <div className="p-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`mb-2 rounded-md p-2 text-xs ${severityColors[alert.severity]} bg-opacity-20`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base">{typeIcons[alert.type]}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="opacity-90">{alert.message}</div>
                    <div className="mt-1 text-[10px] opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
