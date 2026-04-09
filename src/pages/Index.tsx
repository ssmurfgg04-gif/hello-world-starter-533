import { useEffect, useState, useCallback } from 'react';
import { DeckGlobe } from '@/components/DeckGlobe';
import { ControlPanel } from '@/components/ControlPanel';
import { EntityDetailSidebar } from '@/components/EntityDetailSidebar';
import { SearchBar } from '@/components/SearchBar';
import { IntelDashboard } from '@/components/IntelDashboard';
import { SightingPanel } from '@/components/SightingPanel';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { AlertPanel } from '@/components/AlertPanel';
import { ToastNotifications } from '@/components/ToastNotifications';
import { DataExport } from '@/components/DataExport';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { connect as connectAdsbWs, disconnect as disconnectAdsbWs } from '@/services/osint/aircraftService';
import { connect as connectAdsbFi, disconnect as disconnectAdsbFi } from '@/services/osint/adsbfiService';
import { connect as connectOpenSky, disconnect as disconnectOpenSky } from '@/services/osint/openSkyService';
import { connect as connectMaritime, disconnect as disconnectMaritime } from '@/services/osint/maritimeService';
import { connect as connectVesselFeed, disconnect as disconnectVesselFeed } from '@/services/osint/vesselFeedService';
import { connect as connectEarthquakes, disconnect as disconnectEarthquakes } from '@/services/osint/earthquakeService';
import { connect as connectNaturalEvents, disconnect as disconnectNaturalEvents } from '@/services/osint/naturalEventsService';
import { connect as connectMarkets, disconnect as disconnectMarkets } from '@/services/osint/marketService';
import { connect as connectCommodities, disconnect as disconnectCommodities } from '@/services/osint/commoditiesService';
import { connect as connectForex, disconnect as disconnectForex } from '@/services/osint/forexService';
import { connect as connectWeather, disconnect as disconnectWeather } from '@/services/osint/weatherService';
import { connect as connectGDACS, disconnect as disconnectGDACS } from '@/services/osint/gdacsService';
import { connect as connectSatellites, disconnect as disconnectSatellites } from '@/services/osint/satelliteService';
import { connect as connectAPRS, disconnect as disconnectAPRS } from '@/services/osint/aprsService';
import { connect as connectISS, disconnect as disconnectISS } from '@/services/osint/issService';
import { connect as connectThreatIntel, disconnect as disconnectThreatIntel } from '@/services/osint/threatIntelService';
// Demo simulator for synthetic data (fallback when live APIs unavailable due to CORS)
import { startSimulation, stopSimulation } from '@/services/simulation/demoSimulator';
import { startAutoFuse, stopAutoFuse } from '@/services/fusion/fusionEngine';
import { startAnalysis, stopAnalysis } from '@/services/analysis/aiAnalysisEngine';
import { startSightingDetection, stopSightingDetection } from '@/services/fusion/sightingDetection';
// Persistence disabled for browser build - enable when server-side
// import { initPersistence, shutdownPersistence } from '@/services/persistence/persistenceIntegration';
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
  const [deckRef, setDeckRef] = useState<{ centerOnEntity: (lat: number, lon: number) => void } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  
  const handleCenterOnEntity = useCallback((lat: number, lon: number) => {
    deckRef?.centerOnEntity(lat, lon);
  }, [deckRef]);
  
  // Listen for export trigger event
  useEffect(() => {
    const handler = () => setExportOpen(true);
    window.addEventListener('trigger-export', handler);
    return () => window.removeEventListener('trigger-export', handler);
  }, []);

  useEffect(() => {
    // LIVE DATA ONLY - Aircraft sources (free, no API key required)
    audit.info('boot', 'Aircraft sources: adsb.fi + OpenSky (free, global, real-time)');
    connectAdsbFi();  // Primary: adsb.fi (free, no key)
    connectOpenSky(); // Backup: OpenSky (free, no key)

    // Maritime data - always use vessel feed (demo + live polling)
    connectVesselFeed();
    audit.info('boot', 'Maritime source: Vessel feed active (demo + live fallback)');

    // Always-on services (free, no key, no signup)
    connectEarthquakes();
    connectNaturalEvents();
    connectMarkets();
    connectCommodities();
    connectForex();
    connectWeather();
    connectGDACS();
    connectSatellites();
    connectISS(); // NASA ISS live tracking (free)
    connectAPRS(); // APRS amateur radio (requires API key)
    connectThreatIntel(); // Cyber threat intel (abuse.ch URLhaus, free)
    audit.info('boot', 'Started: USGS, NASA EONET, NASA ISS, GDACS, Open-Meteo, Celestrak, abuse.ch URLhaus, CoinGecko, Frankfurter, adsb.fi, OpenSky (all free, no key required)');

    // Persistence layer (PostgreSQL + TimescaleDB) - server-side only
    // initPersistence().then((connected) => {
    //   if (connected) {
    //     audit.info('boot', 'Persistence layer active (PostgreSQL + TimescaleDB)');
    //   } else {
    //     audit.warn('boot', 'Persistence layer disabled (database unavailable)');
    //   }
    // });
    audit.info('boot', 'Running in browser mode (persistence disabled)');

    // Demo simulator as fallback - starts after 8s if no live aircraft data flowing
    const demoCheckTimer = setTimeout(() => {
      const aircraftCount = Array.from(useEntityStore.getState().entities.values()).filter(e => e.type === 'aircraft').length;
      if (aircraftCount < 5) {
        startSimulation();
        audit.info('boot', 'Demo simulator active: synthetic aircraft + vessels (fallback - no live data detected)');
      } else {
        audit.info('boot', 'Live aircraft data flowing - demo simulator skipped');
      }
    }, 8000);

    // Analysis engines
    startAutoFuse();
    startAnalysis();
    
    // Sighting detection (Dark Fleet tracker)
    startSightingDetection();
    audit.info('boot', 'Sighting detection active (aircraft-vessel proximity monitoring)');
      
    // Stale entity cleanup
    const pruneTimer = setInterval(() => {
      useEntityStore.getState().pruneStale(STALE_THRESHOLD_MS);
    }, PRUNE_INTERVAL_MS);

    return () => {
      disconnectAdsbWs();
      disconnectAdsbFi();
      disconnectOpenSky();
      disconnectMaritime();
      disconnectEarthquakes();
      disconnectNaturalEvents();
      disconnectMarkets();
      disconnectCommodities();
      disconnectVesselFeed();
      disconnectForex();
      disconnectWeather();
      disconnectGDACS();
      clearTimeout(demoCheckTimer);
      disconnectSatellites();
      disconnectISS();
      disconnectAPRS();
      disconnectThreatIntel();
      stopSimulation();
      stopAutoFuse();
      stopAnalysis();
      stopSightingDetection();
      clearInterval(pruneTimer);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="osint-root relative h-screen w-screen overflow-hidden bg-black">
        <LoadingOverlay />
        <AlertPanel />
        <DeckGlobe onViewStateRef={setDeckRef} />
        <ControlPanel />
        <SearchBar />
        <SightingPanel />
        <IntelDashboard />
        <ToastNotifications />
        <EntityDetailSidebar onCenterOnEntity={handleCenterOnEntity} />
        <DataExport isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
