/**
 * CoinGecko API for crypto market data.
 *
 * FREE, no API key, no signup required.
 * https://www.coingecko.com/en/api/documentation
 *
 * Fetches top 20 cryptocurrencies with price, volume, and market cap.
 * Also detects significant price movements for alerts.
 */

import type { MarketTicker, MarketAlert } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollTimer: ReturnType<typeof setInterval> | null = null;
const previousPrices: Map<string, number> = new Map();

function detectAlerts(tickers: MarketTicker[]): MarketAlert[] {
  const alerts: MarketAlert[] = [];
  const now = new Date().toISOString();

  for (const t of tickers) {
    const prev = previousPrices.get(t.id);
    if (prev) {
      const change = ((t.price - prev) / prev) * 100;
      if (Math.abs(change) > 3) {
        alerts.push({
          id: `market-${t.id}-${Date.now()}`,
          symbol: t.symbol.toUpperCase(),
          type: change > 0 ? 'spike' : 'crash',
          message: `${t.symbol.toUpperCase()} ${change > 0 ? 'surged' : 'dropped'} ${Math.abs(change).toFixed(1)}% in last update`,
          changePercent: change,
          timestamp: now,
        });
      }
    }
    previousPrices.set(t.id, t.price);
  }

  // 24h alerts
  for (const t of tickers) {
    if (Math.abs(t.changePercent24h) > 10) {
      alerts.push({
        id: `market-24h-${t.id}`,
        symbol: t.symbol.toUpperCase(),
        type: t.changePercent24h > 0 ? 'breakout' : 'crash',
        message: `${t.symbol.toUpperCase()} moved ${t.changePercent24h.toFixed(1)}% in 24h`,
        changePercent: t.changePercent24h,
        timestamp: now,
      });
    }
  }

  return alerts;
}

async function fetchMarkets(): Promise<void> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[marketService] Rate limited, retrying next interval');
        return;
      }
      return;
    }

    const data = await res.json() as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      total_volume: number;
      market_cap: number;
      last_updated: string;
    }>;

    const tickers: MarketTicker[] = data.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      price: c.current_price,
      change24h: c.price_change_24h,
      changePercent24h: c.price_change_percentage_24h,
      volume24h: c.total_volume,
      marketCap: c.market_cap,
      lastUpdated: c.last_updated,
    }));

    const alerts = detectAlerts(tickers);
    const store = useGlobalEventsStore.getState();
    store.setMarketTickers(tickers);
    if (alerts.length > 0) store.addMarketAlerts(alerts);

    console.info(`[marketService] ${tickers.length} tickers, ${alerts.length} alerts`);
  } catch (err) {
    console.error('[marketService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchMarkets();
  pollTimer = setInterval(fetchMarkets, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
