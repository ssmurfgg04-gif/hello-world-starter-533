/**
 * Loading overlay for initial data fetch states.
 * Shows connection status for each service.
 */

import { useEntityStore } from '@/store/entityStore';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

export function LoadingOverlay() {
  const serviceStatuses = useEntityStore((s) => s.serviceStatuses);
  const marketTickers = useGlobalEventsStore((s) => s.marketTickers);
  const commodityTickers = useGlobalEventsStore((s) => s.commodityTickers);
  const forexTickers = useGlobalEventsStore((s) => s.forexTickers);

  // Check if data is flowing
  const hasAircraftData = serviceStatuses.get('adsb-exchange')?.status === 'connected' || 
                          Array.from(useEntityStore.getState().entities.values()).some(e => e.type === 'aircraft');
  const hasVesselData = serviceStatuses.get('marine-traffic')?.status === 'connected' ||
                        Array.from(useEntityStore.getState().entities.values()).some(e => e.type === 'vessel');
  const hasMarketData = marketTickers.length > 0;
  const hasCommodityData = commodityTickers.length > 0;
  const hasForexData = forexTickers.length > 0;

  const isReady = hasAircraftData || hasVesselData || hasMarketData || hasCommodityData || hasForexData;

  if (isReady) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="rounded-lg border border-border/50 bg-background/90 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold">Initializing OSINT Platform...</h2>
        <div className="space-y-2 text-sm">
          <StatusLine label="Aircraft Feed" ready={hasAircraftData} />
          <StatusLine label="Maritime Feed" ready={hasVesselData} />
          <StatusLine label="Market Data" ready={hasMarketData} />
          <StatusLine label="Commodity Data" ready={hasCommodityData} />
          <StatusLine label="Forex Data" ready={hasForexData} />
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Connecting to global data sources...
        </div>
      </div>
    </div>
  );
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={ready ? 'text-green-500' : 'text-amber-500'}>
        {ready ? '✓' : '⏳'}
      </span>
      <span className={ready ? 'text-green-400' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );
}
