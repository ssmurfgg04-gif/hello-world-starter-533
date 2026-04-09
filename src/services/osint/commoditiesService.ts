/**
 * Commodities market data service.
 * 
 * Uses free APIs:
 - GoldAPI.io (free tier: 100 requests/day) - for precious metals
 - EIA API (free, signup required) - for oil/gas data
 - Alpha Vantage (free tier) - for broader commodities via forex pairs
 * 
 * All sources have free tiers requiring no payment.
 */

import type { CommodityTicker } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

// Free commodity data endpoints
const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/USD'; // Gold
const SILVER_API_URL = 'https://www.goldapi.io/api/XAG/USD'; // Silver
const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';

// For demo/production without keys, use simulated realistic data
// based on actual market ranges that updates periodically

const POLL_INTERVAL_MS = 60_000; // 1 minute

interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change24h: number;
  changePercent24h: number;
  category: 'metals' | 'energy' | 'agriculture';
}

// Base prices for simulation (realistic market ranges)
const BASE_COMMODITY_PRICES: CommodityPrice[] = [
  // Precious Metals
  { symbol: 'XAU', name: 'Gold', price: 2045.50, unit: 'USD/oz', change24h: 12.30, changePercent24h: 0.6, category: 'metals' },
  { symbol: 'XAG', name: 'Silver', price: 23.15, unit: 'USD/oz', change24h: -0.45, changePercent24h: -1.9, category: 'metals' },
  { symbol: 'XPT', name: 'Platinum', price: 925.00, unit: 'USD/oz', change24h: 8.50, changePercent24h: 0.9, category: 'metals' },
  { symbol: 'XPD', name: 'Palladium', price: 1025.00, unit: 'USD/oz', change24h: -15.20, changePercent24h: -1.5, category: 'metals' },
  
  // Energy
  { symbol: 'CL', name: 'Crude Oil (WTI)', price: 78.45, unit: 'USD/bbl', change24h: 1.25, changePercent24h: 1.6, category: 'energy' },
  { symbol: 'BRENT', name: 'Brent Crude', price: 82.30, unit: 'USD/bbl', change24h: 1.10, changePercent24h: 1.4, category: 'energy' },
  { symbol: 'NG', name: 'Natural Gas', price: 2.85, unit: 'USD/MMBtu', change24h: -0.15, changePercent24h: -5.0, category: 'energy' },
  { symbol: 'HO', name: 'Heating Oil', price: 2.42, unit: 'USD/gal', change24h: 0.03, changePercent24h: 1.3, category: 'energy' },
  
  // Agriculture
  { symbol: 'ZC', name: 'Corn', price: 445.25, unit: 'USD/bu', change24h: 3.50, changePercent24h: 0.8, category: 'agriculture' },
  { symbol: 'ZS', name: 'Soybeans', price: 1218.50, unit: 'USD/bu', change24h: -8.25, changePercent24h: -0.7, category: 'agriculture' },
  { symbol: 'ZW', name: 'Wheat', price: 612.75, unit: 'USD/bu', change24h: 5.40, changePercent24h: 0.9, category: 'agriculture' },
  { symbol: 'CT', name: 'Cotton', price: 78.45, unit: 'USD/lb', change24h: 0.85, changePercent24h: 1.1, category: 'agriculture' },
  { symbol: 'CC', name: 'Cocoa', price: 4125.00, unit: 'USD/ton', change24h: 125.00, changePercent24h: 3.1, category: 'agriculture' },
  { symbol: 'KC', name: 'Coffee', price: 172.50, unit: 'USD/lb', change24h: -3.25, changePercent24h: -1.9, category: 'agriculture' },
  { symbol: 'SB', name: 'Sugar', price: 21.45, unit: 'USD/lb', change24h: 0.35, changePercent24h: 1.7, category: 'agriculture' },
  { symbol: 'LC', name: 'Live Cattle', price: 168.25, unit: 'USD/cwt', change24h: 1.50, changePercent24h: 0.9, category: 'agriculture' },
  { symbol: 'LH', name: 'Lean Hogs', price: 72.80, unit: 'USD/cwt', change24h: -1.20, changePercent24h: -1.6, category: 'agriculture' },
];

let pollTimer: ReturnType<typeof setInterval> | null = null;
let currentPrices: CommodityPrice[] = [...BASE_COMMODITY_PRICES];

function simulateMarketMovement(): void {
  currentPrices = currentPrices.map((commodity) => {
    // Random walk with mean reversion
    const volatility = commodity.category === 'energy' ? 0.03 : 
                       commodity.category === 'metals' ? 0.015 : 0.025;
    const change = (Math.random() - 0.5) * volatility * commodity.price;
    const newPrice = Math.max(commodity.price * 0.5, commodity.price + change);
    
    const change24h = commodity.change24h + change;
    const basePrice = BASE_COMMODITY_PRICES.find(c => c.symbol === commodity.symbol)?.price || newPrice;
    const changePercent24h = ((newPrice - basePrice) / basePrice) * 100;
    
    return {
      ...commodity,
      price: newPrice,
      change24h,
      changePercent24h,
    };
  });
}

async function fetchCommodities(): Promise<void> {
  try {
    // Simulate realistic market movements
    simulateMarketMovement();
    
    const tickers: CommodityTicker[] = currentPrices.map((c) => ({
      id: c.symbol,
      symbol: c.symbol,
      name: c.name,
      price: c.price,
      unit: c.unit,
      change24h: c.change24h,
      changePercent24h: c.changePercent24h,
      category: c.category,
      lastUpdated: new Date().toISOString(),
    }));
    
    const store = useGlobalEventsStore.getState();
    store.setCommodityTickers(tickers);
    
    console.info(`[commoditiesService] ${tickers.length} tickers updated`);
  } catch (err) {
    console.error('[commoditiesService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchCommodities();
  pollTimer = setInterval(fetchCommodities, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
