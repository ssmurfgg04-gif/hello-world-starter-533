import { useEffect } from 'react';
import { DeckGlobe } from '@/components/DeckGlobe';
import { ControlPanel } from '@/components/ControlPanel';
import { EntityDetailSidebar } from '@/components/EntityDetailSidebar';
import { SearchBar } from '@/components/SearchBar';
import { IntelDashboard } from '@/components/IntelDashboard';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { connect as connectAdsbWs, disconnect as disconnectAdsbWs } from '@/services/osint/aircraftService';
import { connect as connectAdsbFi, disconnect as disconnectAdsbFi } from '@/services/osint/adsbfiService';
import { connect as connectOpenSky, disconnect as disconnectOpenSky } from '@/services/osint/openSkyService';
import { connect as connectMaritime, disconnect as disconnectMaritime } from '@/services/osint/maritimeService';
import { connect as connectEarthquakes, disconnect as disconnectEarthquakes } from '@/services/osint/earthquakeService';
import { connect as connectNaturalEvents, disconnect as disconnectNaturalEvents } from '@/services/osint/naturalEventsService';
import { connect as connectMarkets, disconnect as disconnectMarkets } from '@/services/osint/marketService';
import { shouldUseDemoMode, startSimulation, stopSimulation } from '@/services/simulation/demoSimulator';
import { startAutoFuse, stopAutoFuse } from '@/services/fusion/fusionEngine';
import { startAnalysis, stopAnalysis } from '@/services/analysis/aiAnalysisEngine';
import { useEntityStore } from '@/store/entityStore';
import * as audit from '@/services/audit/auditLogger';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const PRUNE_INTERVAL_MS = 30_000;

function getAircraftStrategy(): 'adsb-ws' | 'free' {
  const adsbKey = import.meta.env.VITE_ADSB_API_KEY ?? '';
  return adsbKey ? 'adsb-ws' : 'free';
}

const Index = () => {
  useKeyboardShortcuts();

  useEffect(() => {
    const demoMode = shouldUseDemoMode();

    if (demoMode) {
      audit.info('boot', 'Starting in DEMO simulation mode');
      startSimulation();
    } else {
      // Aircraft data source
      const aircraftStrategy = getAircraftStrategy();
      if (aircraftStrategy === 'adsb-ws') {
        audit.info('boot', 'Aircraft source: ADS-B Exchange WebSocket (API key present)');
        connectAdsbWs();
      } else {
        audit.info('boot', 'Aircraft source: adsb.fi REST API (free, no key, no signup)');
        connectAdsbFi();
      }

      // Maritime data source
      const aisKey = import.meta.env.VITE_AIS_API_KEY ?? '';
      if (aisKey) {
        audit.info('boot', 'Maritime source: AISstream.io WebSocket');
        connectMaritime();
      } else {
        audit.warn('boot', 'No AIS API key -- maritime feed disabled');
      }
    }

    // Always-on services (free, no key, no signup)
    connectEarthquakes();
    connectNaturalEvents();
    connectMarkets();
    audit.info('boot', 'Started: USGS earthquakes, NASA EONET, CoinGecko markets (all free)');

    // Analysis engines
    startAutoFuse();
    startAnalysis();

    // Stale entity cleanup
    const pruneTimer = setInterval(() => {
      useEntityStore.getState().pruneStale(STALE_THRESHOLD_MS);
    }, PRUNE_INTERVAL_MS);

    return () => {
      if (demoMode) {
        stopSimulation();
      } else {
        disconnectAdsbWs();
        disconnectAdsbFi();
        disconnectOpenSky();
        disconnectMaritime();
      }
      disconnectEarthquakes();
      disconnectNaturalEvents();
      disconnectMarkets();
      stopAutoFuse();
      stopAnalysis();
      clearInterval(pruneTimer);
    };
  }, []);

  return (
    <div className="osint-root relative h-screen w-screen overflow-hidden bg-black">
      <DeckGlobe />
      <ControlPanel />
      <SearchBar />
      <IntelDashboard />
      <EntityDetailSidebar />
    </div>
  );
};

export default Index;
