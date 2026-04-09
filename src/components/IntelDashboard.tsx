/**
 * Intelligence dashboard panel -- right side of viewport.
 * Shows AI insights, market data, natural events, and alerts.
 */

import { useGlobalEventsStore } from '@/store/globalEventsStore';
import type { AnalysisInsight, GeoEvent, MarketTicker, CommodityTicker, ForexTicker } from '@/types/events';

const SEVERITY_COLOURS: Record<string, string> = {
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
  critical: 'border-l-red-500',
};

const EVENT_ICONS: Record<string, string> = {
  earthquake: '地震',
  volcano: '🌋',
  wildfire: '🔥',
  storm: '🌪',
  flood: '🌊',
  iceberg: '🧊',
  dust_haze: '🌫',
  drought: '☀',
};

function InsightCard({ insight }: { insight: AnalysisInsight }) {
  return (
    <div className={`border-l-2 ${SEVERITY_COLOURS[insight.severity] ?? 'border-l-gray-500'} bg-muted/30 p-2 text-xs`}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold text-foreground">{insight.title}</span>
        <span className="text-[9px] text-muted-foreground">
          {insight.confidence > 0 ? `${(insight.confidence * 100).toFixed(0)}%` : ''}
        </span>
      </div>
      <p className="mt-0.5 text-muted-foreground">{insight.description}</p>
    </div>
  );
}

function EventRow({ event }: { event: GeoEvent }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{EVENT_ICONS[event.type] ?? '📍'}</span>
      <div className="flex-1 truncate">
        <span className="text-foreground">{event.title}</span>
      </div>
      {event.magnitude && (
        <span className={`font-mono text-[10px] ${
          event.magnitude >= 5 ? 'text-red-400' : 'text-amber-400'
        }`}>
          M{event.magnitude.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function TickerRow({ ticker }: { ticker: MarketTicker }) {
  const isUp = ticker.changePercent24h >= 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-foreground">{ticker.symbol.toUpperCase()}</span>
      <span className="font-mono text-foreground">${ticker.price < 1 ? ticker.price.toFixed(4) : ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      <span className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{ticker.changePercent24h.toFixed(1)}%
      </span>
    </div>
  );
}

export function IntelDashboard() {
  const insights = useGlobalEventsStore((s) => s.insights);
  const geoEvents = useGlobalEventsStore((s) => s.allGeoEvents);
  const tickers = useGlobalEventsStore((s) => s.marketTickers);
  const alerts = useGlobalEventsStore((s) => s.marketAlerts);
  const commodities = useGlobalEventsStore((s) => s.commodityTickers);
  const forex = useGlobalEventsStore((s) => s.forexTickers);

  return (
    <div className="absolute right-3 top-3 z-30 flex max-h-[calc(100vh-120px)] w-60 flex-col gap-2 overflow-hidden rounded-lg border border-white/10 bg-black/70 shadow-2xl backdrop-blur-xl text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-bold text-white">Intelligence Feed</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {/* AI Insights */}
        {insights.length > 0 && (
          <Section title="AI Analysis">
            <div className="space-y-1.5">
              {insights.slice(0, 8).map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          </Section>
        )}

        {/* Natural Events */}
        {geoEvents.length > 0 && (
          <Section title={`Natural Events (${geoEvents.length})`}>
            <div className="space-y-1">
              {geoEvents.slice(0, 10).map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </Section>
        )}

        {/* Market Data */}
        {tickers.length > 0 && (
          <Section title="Markets">
            <div className="space-y-1">
              {tickers.slice(0, 10).map((t) => (
                <TickerRow key={t.id} ticker={t} />
              ))}
            </div>
          </Section>
        )}

        {/* Market Alerts */}
        {alerts.length > 0 && (
          <Section title="Market Alerts">
            <div className="space-y-1">
              {alerts.slice(0, 5).map((a) => (
                <div key={a.id} className={`text-xs ${a.changePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {a.message}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Commodities */}
        {commodities.length > 0 && (
          <Section title="Commodities">
            <div className="space-y-1">
              {commodities.slice(0, 8).map((c) => (
                <CommodityRow key={c.id} commodity={c} />
              ))}
            </div>
          </Section>
        )}

        {/* Forex */}
        {forex.length > 0 && (
          <Section title="Forex">
            <div className="space-y-1">
              {forex.slice(0, 8).map((f) => (
                <ForexRow key={f.id} forex={f} />
              ))}
            </div>
          </Section>
        )}
      </div>

      <div className="border-t border-border/30 px-3 py-1.5 text-[9px] text-muted-foreground">
        Sources: USGS, NASA EONET, NASA ISS, GDACS, Open-Meteo, Celestrak, abuse.ch URLhaus, CoinGecko, Frankfurter API, adsb.fi, OpenSky (all free, no key required)
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CommodityRow({ commodity: c }: { commodity: CommodityTicker }) {
  const isUp = c.changePercent24h >= 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-foreground">{c.symbol}</span>
      <span className="font-mono text-foreground">{c.price < 100 ? c.price.toFixed(2) : c.price.toLocaleString()}</span>
      <span className="text-[9px] text-muted-foreground">{c.unit}</span>
      <span className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{c.changePercent24h.toFixed(1)}%
      </span>
    </div>
  );
}

function ForexRow({ forex: f }: { forex: ForexTicker }) {
  const isUp = f.changePercent24h >= 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-foreground">{f.symbol}</span>
      <span className="font-mono text-foreground">{f.rate.toFixed(4)}</span>
      <span className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{f.changePercent24h.toFixed(2)}%
      </span>
    </div>
  );
}
