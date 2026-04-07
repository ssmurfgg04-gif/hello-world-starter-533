import { useEffect } from 'react';
import { DeckGlobe } from '@/components/DeckGlobe';
import { ControlPanel } from '@/components/ControlPanel';
import { EntityDetailSidebar } from '@/components/EntityDetailSidebar';
import { SearchBar } from '@/components/SearchBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { connect as connectAdsbWs, disconnect as disconnectAdsbWs } from '@/services/osint/aircraftService';
import { connect as connectOpenSky, disconnect as disconnectOpenSky } from '@/services/osint/openSkyService';
import { connect as connectMaritime, disconnect as disconnectMaritime } from '@/services/osint/maritimeService';
import { shouldUseDemoMode, startSimulation, stopSimulation } from '@/services/simulation/demoSimulator';
import { startAutoFuse, stopAutoFuse } from '@/services/fusion/fusionEngine';
import { useEntityStore } from '@/store/entityStore';
import * as audit from '@/services/audit/auditLogger';

/** Purge entities older than 5 minutes. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const PRUNE_INTERVAL_MS = 30_000;

/**
 * Determine the best aircraft data source:
 * 1. If VITE_ADSB_API_KEY is set, use the premium ADS-B WebSocket
 * 2. Otherwise, use OpenSky Network REST API (free, no key, no signup)
 */
function getAircraftStrategy(): 'adsb-ws' | 'opensky' {
  const adsbKey = import.meta.env.VITE_ADSB_API_KEY ?? '';
  return adsbKey ? 'adsb-ws' : 'opensky';
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
        audit.info('boot', 'Aircraft source: OpenSky Network REST API (free, no key)');
        connectOpenSky();
      }

      // Maritime data source (requires AISstream.io key)
      const aisKey = import.meta.env.VITE_AIS_API_KEY ?? '';
      if (aisKey) {
        audit.info('boot', 'Maritime source: AISstream.io WebSocket');
        connectMaritime();
      } else {
        audit.warn('boot', 'No AIS API key -- maritime feed disabled. Get a free key at https://aisstream.io/');
      }
    }

    startAutoFuse();

    // Periodic stale-entity cleanup
    const pruneTimer = setInterval(() => {
      useEntityStore.getState().pruneStale(STALE_THRESHOLD_MS);
    }, PRUNE_INTERVAL_MS);

    return () => {
      if (demoMode) {
        stopSimulation();
      } else {
        disconnectAdsbWs();
        disconnectOpenSky();
        disconnectMaritime();
      }
      stopAutoFuse();
      clearInterval(pruneTimer);
    };
  }, []);

  return (
    <div className="osint-root relative h-screen w-screen overflow-hidden bg-black">
      <DeckGlobe />
      <ControlPanel />
      <SearchBar />
      <EntityDetailSidebar />
    </div>
  );
};

export default Index;
