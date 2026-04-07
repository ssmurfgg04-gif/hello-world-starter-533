import { useEffect } from 'react';
import { DeckGlobe } from '@/components/DeckGlobe';
import { ControlPanel } from '@/components/ControlPanel';
import { EntityDetailSidebar } from '@/components/EntityDetailSidebar';
import { SearchBar } from '@/components/SearchBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { connect as connectAircraft, disconnect as disconnectAircraft } from '@/services/osint/aircraftService';
import { connect as connectMaritime, disconnect as disconnectMaritime } from '@/services/osint/maritimeService';
import { shouldUseDemoMode, startSimulation, stopSimulation } from '@/services/simulation/demoSimulator';
import { startAutoFuse, stopAutoFuse } from '@/services/fusion/fusionEngine';
import { useEntityStore } from '@/store/entityStore';

/** Purge entities older than 5 minutes. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const PRUNE_INTERVAL_MS = 30_000;

const Index = () => {
  useKeyboardShortcuts();

  useEffect(() => {
    const demoMode = shouldUseDemoMode();

    if (demoMode) {
      console.info('[OSINT] No API keys detected -- starting demo simulation');
      startSimulation();
    } else {
      connectAircraft();
      connectMaritime();
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
        disconnectAircraft();
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
