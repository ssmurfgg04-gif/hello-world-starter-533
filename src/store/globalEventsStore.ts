import { create } from 'zustand';
import type { GeoEvent, MarketTicker, MarketAlert, AnalysisInsight } from '@/types/events';

interface GlobalEventsState {
  /** Geo events by source key. */
  geoEvents: Map<string, GeoEvent[]>;
  /** All geo events flattened. */
  allGeoEvents: GeoEvent[];

  /** Market tickers. */
  marketTickers: MarketTicker[];
  /** Market alerts (recent significant moves). */
  marketAlerts: MarketAlert[];

  /** AI-generated analysis insights. */
  insights: AnalysisInsight[];

  // Visibility toggles
  showEarthquakes: boolean;
  showNaturalEvents: boolean;
  showMarketData: boolean;
}

interface GlobalEventsActions {
  setGeoEvents: (source: string, events: GeoEvent[]) => void;
  setMarketTickers: (tickers: MarketTicker[]) => void;
  addMarketAlerts: (alerts: MarketAlert[]) => void;
  setInsights: (insights: AnalysisInsight[]) => void;
  addInsight: (insight: AnalysisInsight) => void;
  toggleEarthquakes: () => void;
  toggleNaturalEvents: () => void;
  toggleMarketData: () => void;
}

export type GlobalEventsStore = GlobalEventsState & GlobalEventsActions;

const MAX_ALERTS = 50;
const MAX_INSIGHTS = 100;

export const useGlobalEventsStore = create<GlobalEventsStore>((set) => ({
  geoEvents: new Map(),
  allGeoEvents: [],
  marketTickers: [],
  marketAlerts: [],
  insights: [],

  showEarthquakes: true,
  showNaturalEvents: true,
  showMarketData: true,

  setGeoEvents: (source, events) =>
    set((s) => {
      const next = new Map(s.geoEvents);
      next.set(source, events);
      const all = Array.from(next.values()).flat();
      return { geoEvents: next, allGeoEvents: all };
    }),

  setMarketTickers: (tickers) => set({ marketTickers: tickers }),

  addMarketAlerts: (alerts) =>
    set((s) => ({
      marketAlerts: [...alerts, ...s.marketAlerts].slice(0, MAX_ALERTS),
    })),

  setInsights: (insights) => set({ insights }),

  addInsight: (insight) =>
    set((s) => ({
      insights: [insight, ...s.insights].slice(0, MAX_INSIGHTS),
    })),

  toggleEarthquakes: () => set((s) => ({ showEarthquakes: !s.showEarthquakes })),
  toggleNaturalEvents: () => set((s) => ({ showNaturalEvents: !s.showNaturalEvents })),
  toggleMarketData: () => set((s) => ({ showMarketData: !s.showMarketData })),
}));
