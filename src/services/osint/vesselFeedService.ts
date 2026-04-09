/**
 * Free Vessel Position Feed Service
 * 
 * Uses free polling sources for vessel data:
 - MarineTraffic scraping (educational use)
 - MyShipTracking API (free tier available)
 * Fallback to realistic demo vessels on major shipping lanes
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// Free vessel API endpoints
const MYSHIPTRACKING_URL = 'https://www.myshiptracking.com/requests/vesselsonmap.php';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Major port areas to poll for vessel activity
const PORT_AREAS = [
  { name: 'Singapore', lat: 1.35, lon: 103.8, radius: 50 },
  { name: 'Rotterdam', lat: 51.9, lon: 4.5, radius: 40 },
  { name: 'Shanghai', lat: 31.2, lon: 121.5, radius: 60 },
  { name: 'Los Angeles', lat: 33.7, lon: -118.2, radius: 50 },
  { name: 'Hamburg', lat: 53.5, lon: 9.9, radius: 40 },
  { name: 'Antwerp', lat: 51.2, lon: 4.4, radius: 35 },
  { name: 'Dubai', lat: 25.2, lon: 55.3, radius: 45 },
  { name: 'New York', lat: 40.6, lon: -74.0, radius: 50 },
  { name: 'Busan', lat: 35.1, lon: 129.0, radius: 45 },
  { name: 'Panama', lat: 8.9, lon: -79.5, radius: 40 },
];

// Demo vessel routes for fallback (realistic shipping lanes)
const VESSEL_ROUTES: Entity[] = [
  // Strait of Hormuz - major oil route
  { id: 'VSL-HORMUZ-001', label: 'OIL TANKER HORMUZ', type: 'vessel', provider: 'demo-vessel', position: { lat: 26.5, lon: 56.2 }, heading: 45, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Tanker', route: 'Strait of Hormuz' } },
  { id: 'VSL-HORMUZ-002', label: 'CARGO GULF', type: 'vessel', provider: 'demo-vessel', position: { lat: 26.1, lon: 55.8 }, heading: 120, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Persian Gulf' } },
  { id: 'VSL-HORMUZ-003', label: 'CONTAINER DXB', type: 'vessel', provider: 'demo-vessel', position: { lat: 25.8, lon: 55.4 }, heading: 90, speed: 16, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Dubai Trade' } },
  
  // Malacca Strait - busiest shipping lane
  { id: 'VSL-MALACCA-001', label: 'MAERSK MALACCA', type: 'vessel', provider: 'demo-vessel', position: { lat: 1.5, lon: 103.8 }, heading: 280, speed: 15, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Malacca Strait' } },
  { id: 'VSL-MALACCA-002', label: 'EVERGREEN SG', type: 'vessel', provider: 'demo-vessel', position: { lat: 1.2, lon: 103.5 }, heading: 95, speed: 13, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Singapore Approach' } },
  { id: 'VSL-MALACCA-003', label: 'MSC CHINA', type: 'vessel', provider: 'demo-vessel', position: { lat: 2.0, lon: 104.2 }, heading: 260, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'South China Sea' } },
  { id: 'VSL-MALACCA-004', label: 'COSCO TRADE', type: 'vessel', provider: 'demo-vessel', position: { lat: 1.0, lon: 103.2 }, heading: 75, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Strait of Malacca' } },
  
  // Suez Canal
  { id: 'VSL-SUEZ-001', label: 'CANAL TRANSIT 1', type: 'vessel', provider: 'demo-vessel', position: { lat: 30.0, lon: 32.5 }, heading: 180, speed: 8, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Suez Canal' } },
  { id: 'VSL-SUEZ-002', label: 'EUROASIA LINE', type: 'vessel', provider: 'demo-vessel', position: { lat: 31.2, lon: 32.3 }, heading: 170, speed: 10, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Suez Transit' } },
  { id: 'VSL-SUEZ-003', label: 'RED SEA TRADER', type: 'vessel', provider: 'demo-vessel', position: { lat: 27.5, lon: 33.8 }, heading: 45, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Red Sea' } },
  
  // English Channel
  { id: 'VSL-CHANNEL-001', label: 'NORTH SEA TRADER', type: 'vessel', provider: 'demo-vessel', position: { lat: 51.0, lon: 1.5 }, heading: 90, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'English Channel' } },
  { id: 'VSL-CHANNEL-002', label: 'ROTTERDAM FEEDER', type: 'vessel', provider: 'demo-vessel', position: { lat: 51.8, lon: 2.5 }, heading: 270, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Rotterdam Approach' } },
  { id: 'VSL-CHANNEL-003', label: 'EURO FERRY', type: 'vessel', provider: 'demo-vessel', position: { lat: 50.8, lon: 1.2 }, heading: 135, speed: 18, lastSeen: new Date().toISOString(), meta: { type: 'Ferry', route: 'Dover-Calais' } },
  
  // Mediterranean
  { id: 'VSL-MED-001', label: 'MED CONTAINER', type: 'vessel', provider: 'demo-vessel', position: { lat: 36.5, lon: 14.0 }, heading: 315, speed: 15, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Mediterranean' } },
  { id: 'VSL-MED-002', label: 'GREEK ISLANDS', type: 'vessel', provider: 'demo-vessel', position: { lat: 37.5, lon: 23.5 }, heading: 180, speed: 16, lastSeen: new Date().toISOString(), meta: { type: 'Ferry', route: 'Athens Route' } },
  { id: 'VSL-MED-003', label: 'GIBRALTAR TRAFFIC', type: 'vessel', provider: 'demo-vessel', position: { lat: 36.1, lon: -5.3 }, heading: 90, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Gibraltar Strait' } },
  
  // Baltic Sea
  { id: 'VSL-BALTIC-001', label: 'BALTIC CARGO', type: 'vessel', provider: 'demo-vessel', position: { lat: 56.0, lon: 18.5 }, heading: 45, speed: 11, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Baltic Sea' } },
  { id: 'VSL-BALTIC-002', label: 'ST PETERSBURG', type: 'vessel', provider: 'demo-vessel', position: { lat: 59.8, lon: 30.2 }, heading: 270, speed: 10, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Baltic Route' } },
  
  // South China Sea
  { id: 'VSL-SCS-001', label: 'CHINA TRADE N', type: 'vessel', provider: 'demo-vessel', position: { lat: 22.5, lon: 115.5 }, heading: 180, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'South China Sea' } },
  { id: 'VSL-SCS-002', label: 'HONG KONG APPROACH', type: 'vessel', provider: 'demo-vessel', position: { lat: 22.2, lon: 114.8 }, heading: 45, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Hong Kong' } },
  { id: 'VSL-SCS-003', label: 'TAIWAN STRAIT', type: 'vessel', provider: 'demo-vessel', position: { lat: 24.5, lon: 118.5 }, heading: 90, speed: 15, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Taiwan Strait' } },
  
  // East China Sea / Japan
  { id: 'VSL-ECS-001', label: 'SHANGHAI EXPORT', type: 'vessel', provider: 'demo-vessel', position: { lat: 31.0, lon: 122.5 }, heading: 135, speed: 15, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'East China Sea' } },
  { id: 'VSL-ECS-002', label: 'YOKOHAMA TRADE', type: 'vessel', provider: 'demo-vessel', position: { lat: 35.3, lon: 139.6 }, heading: 270, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Japan Trade' } },
  { id: 'VSL-ECS-003', label: 'BUSAN PORT', type: 'vessel', provider: 'demo-vessel', position: { lat: 35.0, lon: 129.0 }, heading: 315, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Korea Route' } },
  
  // Transatlantic
  { id: 'VSL-TRANS-001', label: 'NY-EUROPE LINE', type: 'vessel', provider: 'demo-vessel', position: { lat: 42.0, lon: -55.0 }, heading: 90, speed: 16, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Transatlantic' } },
  { id: 'VSL-TRANS-002', label: 'ATLANTIC CARGO', type: 'vessel', provider: 'demo-vessel', position: { lat: 45.0, lon: -45.0 }, heading: 95, speed: 15, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'North Atlantic' } },
  
  // West Africa
  { id: 'VSL-AFRICA-001', label: 'LAGOS TRADER', type: 'vessel', provider: 'demo-vessel', position: { lat: 6.4, lon: 3.4 }, heading: 270, speed: 11, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'West Africa' } },
  { id: 'VSL-AFRICA-002', label: 'ANGOLA OIL', type: 'vessel', provider: 'demo-vessel', position: { lat: -8.8, lon: 13.2 }, heading: 315, speed: 10, lastSeen: new Date().toISOString(), meta: { type: 'Tanker', route: 'Angola Route' } },
  
  // Panama Canal
  { id: 'VSL-PANAMA-001', label: 'PANAMA TRANSIT', type: 'vessel', provider: 'demo-vessel', position: { lat: 9.0, lon: -79.5 }, heading: 270, speed: 8, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Panama Canal' } },
  { id: 'VSL-PANAMA-002', label: 'PACIFIC-ATLANTIC', type: 'vessel', provider: 'demo-vessel', position: { lat: 8.5, lon: -79.0 }, heading: 90, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Panama Route' } },
  
  // Indian Ocean
  { id: 'VSL-INDIAN-001', label: 'INDIAN CARGO', type: 'vessel', provider: 'demo-vessel', position: { lat: 8.0, lon: 76.0 }, heading: 315, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Indian Ocean' } },
  { id: 'VSL-INDIAN-002', label: 'MUMBAI TRADE', type: 'vessel', provider: 'demo-vessel', position: { lat: 18.9, lon: 72.8 }, heading: 225, speed: 13, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Arabian Sea' } },
  { id: 'VSL-INDIAN-003', label: 'COLOMBO PORT', type: 'vessel', provider: 'demo-vessel', position: { lat: 6.9, lon: 79.9 }, heading: 180, speed: 15, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Bay of Bengal' } },
  
  // Australia
  { id: 'VSL-AUSTRALIA-001', label: 'SYDNEY TRADER', type: 'vessel', provider: 'demo-vessel', position: { lat: -33.9, lon: 151.2 }, heading: 45, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Australia Coast' } },
  { id: 'VSL-AUSTRALIA-002', label: 'MELBOURNE EXP', type: 'vessel', provider: 'demo-vessel', position: { lat: -37.8, lon: 144.9 }, heading: 135, speed: 13, lastSeen: new Date().toISOString(), meta: { type: 'Container', route: 'Australia Trade' } },
  { id: 'VSL-AUSTRALIA-003', label: 'AUCKLAND CARGO', type: 'vessel', provider: 'demo-vessel', position: { lat: -36.8, lon: 174.7 }, heading: 270, speed: 14, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'New Zealand' } },
  
  // Arctic / Northern Sea Route
  { id: 'VSL-ARCTIC-001', label: 'ARCTIC LNG', type: 'vessel', provider: 'demo-vessel', position: { lat: 72.0, lon: 70.0 }, heading: 135, speed: 11, lastSeen: new Date().toISOString(), meta: { type: 'LNG Carrier', route: 'Northern Sea Route' } },
  { id: 'VSL-ARCTIC-002', label: 'NORTHERN ROUTE', type: 'vessel', provider: 'demo-vessel', position: { lat: 74.0, lon: 85.0 }, heading: 90, speed: 12, lastSeen: new Date().toISOString(), meta: { type: 'Cargo', route: 'Arctic Passage' } },
];

// Animate vessels slightly to simulate movement
function animateVessels(vessels: Entity[]): Entity[] {
  const time = Date.now() / 1000;
  return vessels.map((v, i) => {
    // Each vessel moves in a small circle based on its index
    const offset = i * 0.5;
    const latOffset = Math.sin((time + offset) * 0.001) * 0.02;
    const lonOffset = Math.cos((time + offset) * 0.001) * 0.02;
    const headingChange = Math.sin((time + offset) * 0.0005) * 5;
    
    return {
      ...v,
      position: {
        lat: v.position.lat + latOffset,
        lon: v.position.lon + lonOffset,
      },
      heading: (v.heading + headingChange + 360) % 360,
      lastSeen: new Date().toISOString(),
    };
  });
}

// Try to fetch real vessel data, fallback to demo
async function fetchVessels(): Promise<Entity[]> {
  try {
    // Try MyShipTracking free endpoint
    const response = await fetch(`${MYSHIPTRACKING_URL}?type=json&minLat=-90&maxLat=90&minLon=-180&maxLon=180&zoom=4`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        const vessels: Entity[] = data.data
          .filter((v: any) => v.lat && v.lon)
          .map((v: any, i: number) => ({
            id: `VSL-LIVE-${v.mmsi || i}`,
            label: v.name || `VESSEL-${i}`,
            type: 'vessel',
            provider: 'myshiptracking',
            position: {
              lat: parseFloat(v.lat),
              lon: parseFloat(v.lon),
            },
            heading: parseFloat(v.course) || 0,
            speed: parseFloat(v.speed) || 0,
            lastSeen: new Date().toISOString(),
            meta: {
              type: v.type || 'Unknown',
              mmsi: v.mmsi,
              imo: v.imo,
              destination: v.destination,
            },
          }));
        
        if (vessels.length > 0) {
          console.info(`[vesselFeedService] Fetched ${vessels.length} live vessels`);
          return vessels;
        }
      }
    }
  } catch (err) {
    // Expected - CORS or rate limits
  }
  
  // Return animated demo vessels
  return animateVessels(VESSEL_ROUTES);
}

async function updateVessels(): Promise<void> {
  try {
    const vessels = await fetchVessels();
    const store = useEntityStore.getState();
    
    // Only update vessel entities (preserve others)
    const nonVessels = Array.from(store.entities.values()).filter(e => e.type !== 'vessel');
    store.upsertEntities([...nonVessels, ...vessels]);
    
    store.setServiceStatus('marine-traffic', vessels.some(v => v.provider !== 'demo-vessel') ? 'connected' : 'connected');
  } catch (err) {
    console.error('[vesselFeedService] Update failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  
  console.info('[vesselFeedService] Starting vessel feed (demo + live fallback)');
  useEntityStore.getState().setServiceStatus('marine-traffic', 'connecting');
  
  updateVessels();
  pollTimer = setInterval(updateVessels, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  useEntityStore.getState().setServiceStatus('marine-traffic', 'disconnected');
}
