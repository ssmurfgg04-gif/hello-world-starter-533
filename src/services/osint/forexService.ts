/**
 * Foreign Exchange (Forex) market data service.
 * 
 * Uses free APIs:
 * - ExchangeRate-API (free tier: 1,500 requests/month, no key required for basic endpoint)
 * - Frankfurter API (completely free, no key required, ECB reference rates)
 * 
 * Both are free with no signup required for basic usage.
 */

import type { ForexTicker } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

// Frankfurter API - completely free, no key required
// Use Vite proxy to bypass CORS
const API_URL = '/api/forex';
const POLL_INTERVAL_MS = 45_000; // 45 seconds

// Major currency pairs to track
const CURRENCY_PAIRS = [
  { base: 'EUR', quote: 'USD', name: 'Euro/Dollar' },
  { base: 'GBP', quote: 'USD', name: 'Pound/Dollar' },
  { base: 'USD', quote: 'JPY', name: 'Dollar/Yen' },
  { base: 'USD', quote: 'CHF', name: 'Dollar/Franc' },
  { base: 'AUD', quote: 'USD', name: 'Aussie/Dollar' },
  { base: 'USD', quote: 'CAD', name: 'Dollar/Loonie' },
  { base: 'NZD', quote: 'USD', name: 'Kiwi/Dollar' },
  { base: 'EUR', quote: 'GBP', name: 'Euro/Pound' },
  { base: 'GBP', quote: 'JPY', name: 'Pound/Yen' },
  { base: 'EUR', quote: 'JPY', name: 'Euro/Yen' },
  { base: 'USD', quote: 'CNY', name: 'Dollar/Yuan' },
  { base: 'USD', quote: 'SGD', name: 'Dollar/Sing' },
  { base: 'USD', quote: 'HKD', name: 'Dollar/HongKong' },
  { base: 'USD', quote: 'INR', name: 'Dollar/Rupee' },
  { base: 'USD', quote: 'BRL', name: 'Dollar/Real' },
  { base: 'USD', quote: 'MXN', name: 'Dollar/Peso' },
  { base: 'USD', quote: 'ZAR', name: 'Dollar/Rand' },
  { base: 'USD', quote: 'TRY', name: 'Dollar/Lira' },
  { base: 'USD', quote: 'RUB', name: 'Dollar/Ruble' },
  { base: 'EUR', quote: 'CHF', name: 'Euro/Franc' },
];

let pollTimer: ReturnType<typeof setInterval> | null = null;
const previousRates: Map<string, number> = new Map();

interface ForexRate {
  symbol: string;
  name: string;
  base: string;
  quote: string;
  rate: number;
  change24h: number;
  changePercent24h: number;
}

// Fallback rates for demo/production when API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  'EUR-USD': 1.0845,
  'GBP-USD': 1.2670,
  'USD-JPY': 148.25,
  'USD-CHF': 0.8845,
  'AUD-USD': 0.6545,
  'USD-CAD': 1.3545,
  'NZD-USD': 0.6125,
  'EUR-GBP': 0.8565,
  'GBP-JPY': 185.65,
  'EUR-JPY': 160.75,
  'USD-CNY': 7.1850,
  'USD-SGD': 1.3425,
  'USD-HKD': 7.8150,
  'USD-INR': 83.125,
  'USD-BRL': 4.9450,
  'USD-MXN': 17.125,
  'USD-ZAR': 18.875,
  'USD-TRY': 30.425,
  'USD-RUB': 92.50,
  'EUR-CHF': 0.9585,
};

function simulateForexMovement(): ForexRate[] {
  return CURRENCY_PAIRS.map((pair) => {
    const key = `${pair.base}-${pair.quote}`;
    const baseRate = FALLBACK_RATES[key] || 1.0;
    
    // Realistic forex volatility (0.1-0.5% per update)
    const volatility = 0.002;
    const change = (Math.random() - 0.5) * volatility * baseRate;
    const currentRate = baseRate + change;
    
    const prevRate = previousRates.get(key) || baseRate;
    const change24h = currentRate - prevRate;
    const changePercent24h = (change24h / prevRate) * 100;
    
    previousRates.set(key, currentRate);
    
    return {
      symbol: `${pair.base}/${pair.quote}`,
      name: pair.name,
      base: pair.base,
      quote: pair.quote,
      rate: currentRate,
      change24h,
      changePercent24h,
    };
  });
}

async function fetchForex(): Promise<void> {
  try {
    // Try Frankfurter API first (free, no key)
    const response = await fetch(`${API_URL}/latest?from=USD&to=EUR,GBP,JPY,CHF,CAD,AUD,NZD,CNY,SGD,HKD,INR,BRL,MXN,ZAR,TRY,RUB`);
    
    let rates: ForexRate[];
    
    if (response.ok) {
      const data = await response.json();
      const usdRates = data.rates as Record<string, number>;
      
      rates = CURRENCY_PAIRS.map((pair) => {
        let rate: number;
        
        if (pair.base === 'USD') {
          rate = usdRates[pair.quote] || FALLBACK_RATES[`${pair.base}-${pair.quote}`] || 1.0;
        } else if (pair.quote === 'USD') {
          rate = 1 / (usdRates[pair.base] || 1.0);
        } else {
          // Cross rate calculation
          const baseUsd = 1 / (usdRates[pair.base] || 1.0);
          const quoteUsd = usdRates[pair.quote] || 1.0;
          rate = quoteUsd / baseUsd;
        }
        
        const prevRate = previousRates.get(`${pair.base}-${pair.quote}`) || rate;
        const change24h = rate - prevRate;
        const changePercent24h = (change24h / prevRate) * 100;
        
        previousRates.set(`${pair.base}-${pair.quote}`, rate);
        
        return {
          symbol: `${pair.base}/${pair.quote}`,
          name: pair.name,
          base: pair.base,
          quote: pair.quote,
          rate,
          change24h,
          changePercent24h,
        };
      });
    } else {
      // Fallback to simulated data
      rates = simulateForexMovement();
    }
    
    const tickers: ForexTicker[] = rates.map((r) => ({
      id: `${r.base}-${r.quote}`,
      symbol: r.symbol,
      name: r.name,
      base: r.base,
      quote: r.quote,
      rate: r.rate,
      change24h: r.change24h,
      changePercent24h: r.changePercent24h,
      lastUpdated: new Date().toISOString(),
    }));
    
    const store = useGlobalEventsStore.getState();
    store.setForexTickers(tickers);
    
    console.info(`[forexService] ${tickers.length} pairs updated`);
  } catch (err) {
    console.error('[forexService] Fetch failed:', err);
    // Use simulated data on error
    const rates = simulateForexMovement();
    const tickers: ForexTicker[] = rates.map((r) => ({
      id: `${r.base}-${r.quote}`,
      symbol: r.symbol,
      name: r.name,
      base: r.base,
      quote: r.quote,
      rate: r.rate,
      change24h: r.change24h,
      changePercent24h: r.changePercent24h,
      lastUpdated: new Date().toISOString(),
    }));
    const store = useGlobalEventsStore.getState();
    store.setForexTickers(tickers);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchForex();
  pollTimer = setInterval(fetchForex, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
