/**
 * Demo simulator that generates synthetic aircraft and vessel entities
 * with realistic movement patterns. Activated automatically when no
 * API keys are configured, so the platform works out of the box.
 *
 * Simulates:
 *   - 25 aircraft on plausible routes (transatlantic, transpacific, regional)
 *   - 15 vessels on major shipping lanes (Strait of Hormuz, Malacca, etc.)
 *   - Occasional proximity events to trigger fusion relations
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

interface Waypoint {
  lat: number;
  lon: number;
  alt?: number;
}

interface SimRoute {
  id: string;
  label: string;
  type: 'aircraft' | 'vessel';
  waypoints: Waypoint[];
  speed: number; // knots
}

// Generate 100 aircraft routes covering all major global air corridors
const AIRCRAFT_ROUTES: SimRoute[] = [
  // Transatlantic (North America <-> Europe)
  { id: 'AC001', label: 'BAW117', type: 'aircraft', speed: 480, waypoints: [{ lat: 51.47, lon: -0.46, alt: 11000 }, { lat: 49.01, lon: -20.0, alt: 11500 }, { lat: 42.36, lon: -50.0, alt: 11200 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC002', label: 'UAL901', type: 'aircraft', speed: 490, waypoints: [{ lat: 37.62, lon: -122.38, alt: 10800 }, { lat: 40.0, lon: -150.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC003', label: 'DLH400', type: 'aircraft', speed: 470, waypoints: [{ lat: 50.03, lon: 8.57, alt: 10500 }, { lat: 55.0, lon: -20.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 2500 }] },
  { id: 'AC004', label: 'AFR012', type: 'aircraft', speed: 465, waypoints: [{ lat: 49.0, lon: 2.55, alt: 10200 }, { lat: 46.0, lon: -10.0, alt: 10800 }, { lat: 40.64, lon: -73.78, alt: 2800 }] },
  { id: 'AC005', label: 'SIA321', type: 'aircraft', speed: 500, waypoints: [{ lat: 1.36, lon: 103.99, alt: 11200 }, { lat: 10.0, lon: 80.0, alt: 11500 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  { id: 'AC006', label: 'QFA7', type: 'aircraft', speed: 490, waypoints: [{ lat: -33.95, lon: 151.18, alt: 10500 }, { lat: -10.0, lon: 130.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 2500 }] },
  { id: 'AC007', label: 'EK203', type: 'aircraft', speed: 485, waypoints: [{ lat: 25.25, lon: 55.36, alt: 10800 }, { lat: 30.0, lon: 35.0, alt: 11000 }, { lat: 40.08, lon: -3.57, alt: 11200 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC008', label: 'CPA100', type: 'aircraft', speed: 475, waypoints: [{ lat: 22.31, lon: 113.91, alt: 10200 }, { lat: 30.0, lon: 130.0, alt: 10800 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC009', label: 'THY33', type: 'aircraft', speed: 460, waypoints: [{ lat: 41.26, lon: 28.75, alt: 10000 }, { lat: 45.0, lon: 15.0, alt: 10500 }, { lat: 51.47, lon: -0.46, alt: 2500 }] },
  { id: 'AC010', label: 'ANA1', type: 'aircraft', speed: 495, waypoints: [{ lat: 35.55, lon: 139.78, alt: 10800 }, { lat: 50.0, lon: 170.0, alt: 11200 }, { lat: 47.45, lon: -122.31, alt: 3000 }] },
  // European routes
  { id: 'AC011', label: 'RYR815', type: 'aircraft', speed: 420, waypoints: [{ lat: 53.42, lon: -6.27, alt: 10000 }, { lat: 48.0, lon: -2.0, alt: 10200 }, { lat: 41.3, lon: 2.08, alt: 2000 }] },
  { id: 'AC012', label: 'ETH500', type: 'aircraft', speed: 470, waypoints: [{ lat: 8.98, lon: 38.80, alt: 10500 }, { lat: 15.0, lon: 45.0, alt: 11000 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  { id: 'AC013', label: 'AAL100', type: 'aircraft', speed: 480, waypoints: [{ lat: 40.64, lon: -73.78, alt: 10800 }, { lat: 35.0, lon: -60.0, alt: 11000 }, { lat: 25.79, lon: -80.29, alt: 2500 }] },
  { id: 'AC014', label: 'JAL5', type: 'aircraft', speed: 485, waypoints: [{ lat: 35.55, lon: 139.78, alt: 10500 }, { lat: 22.31, lon: 113.91, alt: 3000 }] },
  { id: 'AC015', label: 'LAN800', type: 'aircraft', speed: 470, waypoints: [{ lat: -33.39, lon: -70.79, alt: 10200 }, { lat: -23.0, lon: -46.63, alt: 10800 }, { lat: -22.91, lon: -43.17, alt: 3000 }] },
  // Asia-Pacific routes
  { id: 'AC016', label: 'NAVY01', type: 'aircraft', speed: 220, waypoints: [{ lat: 26.2, lon: 56.0, alt: 5000 }, { lat: 26.6, lon: 56.5, alt: 5200 }, { lat: 26.4, lon: 56.2, alt: 5100 }] },
  { id: 'AC017', label: 'COAST1', type: 'aircraft', speed: 180, waypoints: [{ lat: 1.5, lon: 104.0, alt: 3000 }, { lat: 1.8, lon: 104.3, alt: 3200 }, { lat: 1.3, lon: 103.8, alt: 3100 }] },
  { id: 'AC018', label: 'RECON7', type: 'aircraft', speed: 250, waypoints: [{ lat: 34.0, lon: 130.0, alt: 8000 }, { lat: 34.5, lon: 131.0, alt: 8200 }, { lat: 33.5, lon: 129.5, alt: 7800 }] },
  { id: 'AC019', label: 'EZY45', type: 'aircraft', speed: 410, waypoints: [{ lat: 51.15, lon: -0.19, alt: 9800 }, { lat: 47.0, lon: 5.0, alt: 10200 }, { lat: 43.62, lon: 7.21, alt: 2000 }] },
  { id: 'AC020', label: 'SWR85', type: 'aircraft', speed: 460, waypoints: [{ lat: 47.46, lon: 8.56, alt: 10000 }, { lat: 42.0, lon: 20.0, alt: 10500 }, { lat: 37.94, lon: 23.94, alt: 2500 }] },
  // More Europe
  { id: 'AC021', label: 'KLM605', type: 'aircraft', speed: 475, waypoints: [{ lat: 52.31, lon: 4.76, alt: 10800 }, { lat: 48.0, lon: -5.0, alt: 11000 }, { lat: 38.77, lon: -9.13, alt: 3000 }] },
  { id: 'AC022', label: 'ACA855', type: 'aircraft', speed: 480, waypoints: [{ lat: 43.68, lon: -79.63, alt: 10500 }, { lat: 50.0, lon: -55.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC023', label: 'QTR77', type: 'aircraft', speed: 490, waypoints: [{ lat: 25.27, lon: 51.61, alt: 10800 }, { lat: 35.0, lon: 30.0, alt: 11200 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC024', label: 'VOZ401', type: 'aircraft', speed: 440, waypoints: [{ lat: -37.67, lon: 144.84, alt: 10000 }, { lat: -31.95, lon: 141.0, alt: 10500 }, { lat: -33.95, lon: 151.18, alt: 2500 }] },
  { id: 'AC025', label: 'TAP901', type: 'aircraft', speed: 465, waypoints: [{ lat: 38.77, lon: -9.13, alt: 10200 }, { lat: 30.0, lon: -30.0, alt: 10800 }, { lat: -22.91, lon: -43.17, alt: 3000 }] },
  // Additional global routes (batch 1)
  { id: 'AC026', label: 'AFR101', type: 'aircraft', speed: 470, waypoints: [{ lat: -26.14, lon: 28.25, alt: 10500 }, { lat: 0.0, lon: 10.0, alt: 11000 }, { lat: 49.0, lon: 2.55, alt: 3000 }] },
  { id: 'AC027', label: 'MAS211', type: 'aircraft', speed: 480, waypoints: [{ lat: 2.75, lon: 101.68, alt: 10200 }, { lat: 15.0, lon: 120.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC028', label: 'THA601', type: 'aircraft', speed: 475, waypoints: [{ lat: 13.69, lon: 100.75, alt: 10500 }, { lat: 20.0, lon: 110.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 2500 }] },
  { id: 'AC029', label: 'UAE201', type: 'aircraft', speed: 490, waypoints: [{ lat: 25.25, lon: 55.36, alt: 10800 }, { lat: 40.0, lon: 60.0, alt: 11200 }, { lat: 28.61, lon: 77.21, alt: 3000 }] },
  { id: 'AC030', label: 'IND101', type: 'aircraft', speed: 480, waypoints: [{ lat: 28.61, lon: 77.21, alt: 10500 }, { lat: 20.0, lon: 90.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 3000 }] },
  { id: 'AC031', label: 'SWA201', type: 'aircraft', speed: 450, waypoints: [{ lat: 32.78, lon: -96.8, alt: 9500 }, { lat: 35.0, lon: -110.0, alt: 10000 }, { lat: 33.94, lon: -118.41, alt: 2500 }] },
  { id: 'AC032', label: 'DAL405', type: 'aircraft', speed: 480, waypoints: [{ lat: 33.64, lon: -84.42, alt: 10500 }, { lat: 40.0, lon: -75.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC033', label: 'UAE302', type: 'aircraft', speed: 490, waypoints: [{ lat: 25.25, lon: 55.36, alt: 10800 }, { lat: 15.0, lon: 50.0, alt: 11200 }, { lat: -1.29, lon: 36.82, alt: 3000 }] },
  { id: 'AC034', label: 'QFA2', type: 'aircraft', speed: 485, waypoints: [{ lat: -33.95, lon: 151.18, alt: 10500 }, { lat: -20.0, lon: 140.0, alt: 11000 }, { lat: 13.69, lon: 100.75, alt: 3000 }] },
  { id: 'AC035', label: 'SAA322', type: 'aircraft', speed: 480, waypoints: [{ lat: -26.14, lon: 28.25, alt: 10500 }, { lat: -10.0, lon: 25.0, alt: 11000 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  // North America
  { id: 'AC036', label: 'AAL200', type: 'aircraft', speed: 480, waypoints: [{ lat: 40.64, lon: -73.78, alt: 10500 }, { lat: 42.0, lon: -95.0, alt: 11000 }, { lat: 33.94, lon: -118.41, alt: 3000 }] },
  { id: 'AC037', label: 'UAL150', type: 'aircraft', speed: 485, waypoints: [{ lat: 41.98, lon: -87.91, alt: 10500 }, { lat: 38.0, lon: -110.0, alt: 11000 }, { lat: 37.62, lon: -122.38, alt: 3000 }] },
  { id: 'AC038', label: 'DAL800', type: 'aircraft', speed: 480, waypoints: [{ lat: 33.64, lon: -84.42, alt: 10500 }, { lat: 38.0, lon: -100.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC039', label: 'JBU200', type: 'aircraft', speed: 470, waypoints: [{ lat: 40.64, lon: -73.78, alt: 10500 }, { lat: 35.0, lon: -80.0, alt: 11000 }, { lat: 25.79, lon: -80.29, alt: 2500 }] },
  { id: 'AC040', label: 'SWA500', type: 'aircraft', speed: 450, waypoints: [{ lat: 32.78, lon: -96.8, alt: 10000 }, { lat: 30.0, lon: -95.0, alt: 10200 }, { lat: 29.98, lon: -90.26, alt: 2000 }] },
  { id: 'AC041', label: 'UAL400', type: 'aircraft', speed: 480, waypoints: [{ lat: 39.86, lon: -104.67, alt: 10500 }, { lat: 42.0, lon: -110.0, alt: 11000 }, { lat: 47.45, lon: -122.31, alt: 3000 }] },
  { id: 'AC042', label: 'AAL300', type: 'aircraft', speed: 485, waypoints: [{ lat: 33.94, lon: -118.41, alt: 10800 }, { lat: 36.0, lon: -110.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC043', label: 'DAL600', type: 'aircraft', speed: 480, waypoints: [{ lat: 33.64, lon: -84.42, alt: 10500 }, { lat: 35.0, lon: -90.0, alt: 10800 }, { lat: 32.78, lon: -96.8, alt: 2500 }] },
  { id: 'AC044', label: 'JBU500', type: 'aircraft', speed: 470, waypoints: [{ lat: 40.78, lon: -73.0, alt: 10000 }, { lat: 38.0, lon: -75.0, alt: 10500 }, { lat: 33.64, lon: -84.42, alt: 2500 }] },
  { id: 'AC045', label: 'UAL250', type: 'aircraft', speed: 485, waypoints: [{ lat: 37.62, lon: -122.38, alt: 10500 }, { lat: 40.0, lon: -115.0, alt: 11000 }, { lat: 39.86, lon: -104.67, alt: 3000 }] },
  // South America
  { id: 'AC046', label: 'LAN700', type: 'aircraft', speed: 470, waypoints: [{ lat: -33.39, lon: -70.79, alt: 10200 }, { lat: -25.0, lon: -60.0, alt: 10800 }, { lat: -34.6, lon: -58.38, alt: 3000 }] },
  { id: 'AC047', label: 'GOL200', type: 'aircraft', speed: 460, waypoints: [{ lat: -22.91, lon: -43.17, alt: 10000 }, { lat: -15.0, lon: -50.0, alt: 10500 }, { lat: -33.39, lon: -70.79, alt: 3000 }] },
  { id: 'AC048', label: 'AVA100', type: 'aircraft', speed: 470, waypoints: [{ lat: 4.7, lon: -74.15, alt: 10500 }, { lat: 0.0, lon: -70.0, alt: 11000 }, { lat: -33.39, lon: -70.79, alt: 3000 }] },
  { id: 'AC049', label: 'AAL800', type: 'aircraft', speed: 480, waypoints: [{ lat: 25.79, lon: -80.29, alt: 10500 }, { lat: 15.0, lon: -70.0, alt: 11000 }, { lat: -22.91, lon: -43.17, alt: 3000 }] },
  { id: 'AC050', label: 'LAT500', type: 'aircraft', speed: 475, waypoints: [{ lat: -34.6, lon: -58.38, alt: 10200 }, { lat: -30.0, lon: -60.0, alt: 10800 }, { lat: -23.0, lon: -46.63, alt: 2500 }] },
  // Africa
  { id: 'AC051', label: 'ETH800', type: 'aircraft', speed: 470, waypoints: [{ lat: 8.98, lon: 38.80, alt: 10500 }, { lat: 0.0, lon: 35.0, alt: 11000 }, { lat: -1.29, lon: 36.82, alt: 3000 }] },
  { id: 'AC052', label: 'SAA200', type: 'aircraft', speed: 480, waypoints: [{ lat: -26.14, lon: 28.25, alt: 10500 }, { lat: -20.0, lon: 25.0, alt: 11000 }, { lat: -1.29, lon: 36.82, alt: 3000 }] },
  { id: 'AC053', label: 'KQA100', type: 'aircraft', speed: 465, waypoints: [{ lat: -1.29, lon: 36.82, alt: 10500 }, { lat: -5.0, lon: 38.0, alt: 10800 }, { lat: -6.78, lon: 39.21, alt: 2500 }] },
  { id: 'AC054', label: 'EGY200', type: 'aircraft', speed: 480, waypoints: [{ lat: 30.12, lon: 31.4, alt: 10500 }, { lat: 25.0, lon: 35.0, alt: 11000 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  { id: 'AC055', label: 'ETH300', type: 'aircraft', speed: 470, waypoints: [{ lat: 8.98, lon: 38.80, alt: 10500 }, { lat: 15.0, lon: 35.0, alt: 11000 }, { lat: 21.42, lon: 39.83, alt: 3000 }] },
  // More Asia
  { id: 'AC056', label: 'CES200', type: 'aircraft', speed: 480, waypoints: [{ lat: 31.14, lon: 121.81, alt: 10500 }, { lat: 35.0, lon: 130.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC057', label: 'CPA500', type: 'aircraft', speed: 485, waypoints: [{ lat: 22.31, lon: 113.91, alt: 10500 }, { lat: 25.0, lon: 125.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC058', label: 'KAL301', type: 'aircraft', speed: 490, waypoints: [{ lat: 37.46, lon: 126.71, alt: 10500 }, { lat: 45.0, lon: 140.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC059', label: 'SIA100', type: 'aircraft', speed: 485, waypoints: [{ lat: 1.36, lon: 103.99, alt: 10500 }, { lat: 10.0, lon: 105.0, alt: 11000 }, { lat: 13.69, lon: 100.75, alt: 3000 }] },
  { id: 'AC060', label: 'VJC200', type: 'aircraft', speed: 470, waypoints: [{ lat: 10.82, lon: 106.67, alt: 10000 }, { lat: 15.0, lon: 110.0, alt: 10500 }, { lat: 22.31, lon: 113.91, alt: 2500 }] },
  // Middle East
  { id: 'AC061', label: 'ETD100', type: 'aircraft', speed: 490, waypoints: [{ lat: 24.45, lon: 54.38, alt: 10500 }, { lat: 30.0, lon: 45.0, alt: 11000 }, { lat: 35.0, lon: 35.0, alt: 3000 }] },
  { id: 'AC062', label: 'SVA200', type: 'aircraft', speed: 480, waypoints: [{ lat: 21.67, lon: 39.15, alt: 10500 }, { lat: 25.0, lon: 45.0, alt: 11000 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  { id: 'AC063', label: 'QTR150', type: 'aircraft', speed: 490, waypoints: [{ lat: 25.27, lon: 51.61, alt: 10500 }, { lat: 30.0, lon: 35.0, alt: 11000 }, { lat: 37.98, lon: 23.73, alt: 3000 }] },
  { id: 'AC064', label: 'ETD500', type: 'aircraft', speed: 485, waypoints: [{ lat: 24.45, lon: 54.38, alt: 10500 }, { lat: 20.0, lon: 50.0, alt: 11000 }, { lat: 13.69, lon: 100.75, alt: 3000 }] },
  { id: 'AC065', label: 'SVA400', type: 'aircraft', speed: 480, waypoints: [{ lat: 21.67, lon: 39.15, alt: 10500 }, { lat: 28.0, lon: 48.0, alt: 11000 }, { lat: 41.26, lon: 28.75, alt: 3000 }] },
  // Oceania
  { id: 'AC066', label: 'QFA100', type: 'aircraft', speed: 490, waypoints: [{ lat: -33.95, lon: 151.18, alt: 10500 }, { lat: -28.0, lon: 145.0, alt: 11000 }, { lat: -27.47, lon: 153.03, alt: 2500 }] },
  { id: 'AC067', label: 'VOZ300', type: 'aircraft', speed: 460, waypoints: [{ lat: -33.95, lon: 151.18, alt: 10000 }, { lat: -35.0, lon: 145.0, alt: 10500 }, { lat: -37.67, lon: 144.84, alt: 2500 }] },
  { id: 'AC068', label: 'ANZ200', type: 'aircraft', speed: 480, waypoints: [{ lat: -36.85, lon: 174.76, alt: 10500 }, { lat: -30.0, lon: 170.0, alt: 11000 }, { lat: -33.95, lon: 151.18, alt: 3000 }] },
  { id: 'AC069', label: 'JST100', type: 'aircraft', speed: 450, waypoints: [{ lat: -27.47, lon: 153.03, alt: 10000 }, { lat: -25.0, lon: 150.0, alt: 10500 }, { lat: -33.95, lon: 151.18, alt: 2500 }] },
  { id: 'AC070', label: 'QFA50', type: 'aircraft', speed: 485, waypoints: [{ lat: -33.95, lon: 151.18, alt: 10500 }, { lat: -38.0, lon: 145.0, alt: 11000 }, { lat: -36.85, lon: 174.76, alt: 3000 }] },
  // Arctic/Northern
  { id: 'AC071', label: 'ICE100', type: 'aircraft', speed: 470, waypoints: [{ lat: 64.13, lon: -21.94, alt: 10500 }, { lat: 60.0, lon: -30.0, alt: 11000 }, { lat: 53.35, lon: -6.26, alt: 3000 }] },
  { id: 'AC072', label: 'FIN200', type: 'aircraft', speed: 480, waypoints: [{ lat: 60.32, lon: 24.97, alt: 10500 }, { lat: 55.0, lon: 20.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC073', label: 'SAS300', type: 'aircraft', speed: 475, waypoints: [{ lat: 59.65, lon: 17.94, alt: 10500 }, { lat: 55.0, lon: 10.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC074', label: 'ICE200', type: 'aircraft', speed: 470, waypoints: [{ lat: 64.13, lon: -21.94, alt: 10500 }, { lat: 55.0, lon: -40.0, alt: 11000 }, { lat: 42.36, lon: -71.01, alt: 3000 }] },
  { id: 'AC075', label: 'NOR100', type: 'aircraft', speed: 480, waypoints: [{ lat: 60.2, lon: 11.08, alt: 10000 }, { lat: 55.0, lon: 5.0, alt: 10500 }, { lat: 50.03, lon: 8.57, alt: 2500 }] },
  // More routes (batch 2)
  { id: 'AC076', label: 'UAE400', type: 'aircraft', speed: 490, waypoints: [{ lat: 25.25, lon: 55.36, alt: 10500 }, { lat: 15.0, lon: 60.0, alt: 11000 }, { lat: 6.91, lon: 79.85, alt: 3000 }] },
  { id: 'AC077', label: 'THY200', type: 'aircraft', speed: 480, waypoints: [{ lat: 41.26, lon: 28.75, alt: 10500 }, { lat: 45.0, lon: 35.0, alt: 11000 }, { lat: 40.08, lon: 32.91, alt: 3000 }] },
  { id: 'AC078', label: 'AZA100', type: 'aircraft', speed: 475, waypoints: [{ lat: 41.8, lon: 12.25, alt: 10000 }, { lat: 40.0, lon: 15.0, alt: 10500 }, { lat: 37.94, lon: 23.94, alt: 2500 }] },
  { id: 'AC079', label: 'LOT200', type: 'aircraft', speed: 470, waypoints: [{ lat: 52.17, lon: 20.97, alt: 10500 }, { lat: 50.0, lon: 15.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC080', label: 'CSA300', type: 'aircraft', speed: 465, waypoints: [{ lat: 50.1, lon: 14.26, alt: 10000 }, { lat: 48.0, lon: 10.0, alt: 10500 }, { lat: 41.8, lon: 12.25, alt: 2500 }] },
  { id: 'AC081', label: 'AAL500', type: 'aircraft', speed: 480, waypoints: [{ lat: 25.79, lon: -80.29, alt: 10500 }, { lat: 30.0, lon: -75.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 2500 }] },
  { id: 'AC082', label: 'DAL300', type: 'aircraft', speed: 485, waypoints: [{ lat: 33.64, lon: -84.42, alt: 10500 }, { lat: 40.0, lon: -80.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC083', label: 'UAL600', type: 'aircraft', speed: 480, waypoints: [{ lat: 39.86, lon: -104.67, alt: 10500 }, { lat: 45.0, lon: -100.0, alt: 11000 }, { lat: 53.35, lon: -6.26, alt: 3000 }] },
  { id: 'AC084', label: 'AAL700', type: 'aircraft', speed: 485, waypoints: [{ lat: 32.78, lon: -96.8, alt: 10500 }, { lat: 35.0, lon: -110.0, alt: 11000 }, { lat: 33.94, lon: -118.41, alt: 3000 }] },
  { id: 'AC085', label: 'SWA800', type: 'aircraft', speed: 450, waypoints: [{ lat: 29.98, lon: -90.26, alt: 10000 }, { lat: 28.0, lon: -95.0, alt: 10500 }, { lat: 29.64, lon: -98.48, alt: 2500 }] },
  { id: 'AC086', label: 'JBU800', type: 'aircraft', speed: 470, waypoints: [{ lat: 25.79, lon: -80.29, alt: 10000 }, { lat: 30.0, lon: -75.0, alt: 10500 }, { lat: 40.78, lon: -73.0, alt: 2500 }] },
  { id: 'AC087', label: 'DAL100', type: 'aircraft', speed: 485, waypoints: [{ lat: 33.64, lon: -84.42, alt: 10500 }, { lat: 40.0, lon: -70.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC088', label: 'UAL100', type: 'aircraft', speed: 490, waypoints: [{ lat: 41.98, lon: -87.91, alt: 10500 }, { lat: 50.0, lon: -60.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC089', label: 'AAL400', type: 'aircraft', speed: 480, waypoints: [{ lat: 40.64, lon: -73.78, alt: 10500 }, { lat: 45.0, lon: -60.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC090', label: 'BAW200', type: 'aircraft', speed: 490, waypoints: [{ lat: 51.47, lon: -0.46, alt: 10500 }, { lat: 55.0, lon: -20.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  // Pacific routes
  { id: 'AC091', label: 'CPA800', type: 'aircraft', speed: 485, waypoints: [{ lat: 22.31, lon: 113.91, alt: 10500 }, { lat: 10.0, lon: 140.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 3000 }] },
  { id: 'AC092', label: 'PAL100', type: 'aircraft', speed: 480, waypoints: [{ lat: 14.51, lon: 121.02, alt: 10500 }, { lat: 20.0, lon: 130.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC093', label: 'VJC500', type: 'aircraft', speed: 470, waypoints: [{ lat: 10.82, lon: 106.67, alt: 10000 }, { lat: 15.0, lon: 115.0, alt: 10500 }, { lat: 22.31, lon: 113.91, alt: 2500 }] },
  { id: 'AC094', label: 'MAS500', type: 'aircraft', speed: 480, waypoints: [{ lat: 2.75, lon: 101.68, alt: 10500 }, { lat: 8.0, lon: 110.0, alt: 11000 }, { lat: 14.51, lon: 121.02, alt: 3000 }] },
  { id: 'AC095', label: 'THA800', type: 'aircraft', speed: 485, waypoints: [{ lat: 13.69, lon: 100.75, alt: 10500 }, { lat: 10.0, lon: 115.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 3000 }] },
  { id: 'AC096', label: 'SIA800', type: 'aircraft', speed: 490, waypoints: [{ lat: 1.36, lon: 103.99, alt: 10500 }, { lat: 5.0, lon: 130.0, alt: 11000 }, { lat: 14.51, lon: 121.02, alt: 3000 }] },
  { id: 'AC097', label: 'CES500', type: 'aircraft', speed: 480, waypoints: [{ lat: 31.14, lon: 121.81, alt: 10500 }, { lat: 28.0, lon: 125.0, alt: 11000 }, { lat: 22.31, lon: 113.91, alt: 3000 }] },
  { id: 'AC098', label: 'KAL500', type: 'aircraft', speed: 485, waypoints: [{ lat: 37.46, lon: 126.71, alt: 10500 }, { lat: 35.0, lon: 130.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC099', label: 'JAL50', type: 'aircraft', speed: 490, waypoints: [{ lat: 35.55, lon: 139.78, alt: 10500 }, { lat: 40.0, lon: 150.0, alt: 11000 }, { lat: 37.62, lon: -122.38, alt: 3000 }] },
  { id: 'AC100', label: 'ANA50', type: 'aircraft', speed: 485, waypoints: [{ lat: 35.55, lon: 139.78, alt: 10500 }, { lat: 30.0, lon: 140.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 3000 }] },
];

// Generate 50 vessel routes covering major shipping lanes
const VESSEL_ROUTES: SimRoute[] = [
  // Strait of Hormuz traffic (heavy oil traffic)
  { id: 'VE001', label: 'HORMUZ STAR', type: 'vessel', speed: 14, waypoints: [{ lat: 26.2, lon: 56.1 }, { lat: 26.5, lon: 56.4 }, { lat: 26.8, lon: 56.6 }] },
  { id: 'VE002', label: 'PERSIAN GULF', type: 'vessel', speed: 12, waypoints: [{ lat: 26.4, lon: 56.3 }, { lat: 26.1, lon: 56.0 }, { lat: 25.8, lon: 55.7 }] },
  { id: 'VE003', label: 'DUBAI TRADER', type: 'vessel', speed: 11, waypoints: [{ lat: 25.3, lon: 55.3 }, { lat: 26.0, lon: 56.0 }, { lat: 26.5, lon: 56.5 }] },
  { id: 'VE004', label: 'OIL TANKER 1', type: 'vessel', speed: 13, waypoints: [{ lat: 28.0, lon: 49.5 }, { lat: 27.0, lon: 52.0 }, { lat: 26.5, lon: 56.0 }] },
  { id: 'VE005', label: 'OIL TANKER 2', type: 'vessel', speed: 12, waypoints: [{ lat: 29.0, lon: 48.0 }, { lat: 27.5, lon: 51.0 }, { lat: 26.8, lon: 55.0 }] },
  // Malacca Strait (busiest strait)
  { id: 'VE006', label: 'MAERSK SENTOSA', type: 'vessel', speed: 16, waypoints: [{ lat: 1.2, lon: 103.5 }, { lat: 1.8, lon: 104.2 }, { lat: 2.5, lon: 104.8 }] },
  { id: 'VE007', label: 'SINGAPORE EXP', type: 'vessel', speed: 13, waypoints: [{ lat: 2.0, lon: 104.5 }, { lat: 1.5, lon: 104.0 }, { lat: 1.0, lon: 103.5 }] },
  { id: 'VE008', label: 'EVERGREEN A', type: 'vessel', speed: 15, waypoints: [{ lat: 1.5, lon: 103.0 }, { lat: 2.0, lon: 104.0 }, { lat: 2.8, lon: 105.0 }] },
  { id: 'VE009', label: 'COSCO SHIPPING', type: 'vessel', speed: 14, waypoints: [{ lat: 1.0, lon: 103.0 }, { lat: 1.6, lon: 104.0 }, { lat: 2.4, lon: 105.0 }] },
  { id: 'VE010', label: 'MSC CONTAINER', type: 'vessel', speed: 15, waypoints: [{ lat: 0.8, lon: 103.5 }, { lat: 1.5, lon: 104.5 }, { lat: 2.2, lon: 105.5 }] },
  // Suez Canal approach
  { id: 'VE011', label: 'CANAL QUEEN', type: 'vessel', speed: 10, waypoints: [{ lat: 29.9, lon: 32.5 }, { lat: 30.5, lon: 32.3 }, { lat: 31.2, lon: 32.3 }] },
  { id: 'VE012', label: 'RED SEA FWD', type: 'vessel', speed: 14, waypoints: [{ lat: 27.0, lon: 34.0 }, { lat: 28.5, lon: 33.0 }, { lat: 29.9, lon: 32.5 }] },
  { id: 'VE013', label: 'MEDITERRANEAN', type: 'vessel', speed: 13, waypoints: [{ lat: 31.5, lon: 32.0 }, { lat: 31.0, lon: 32.5 }, { lat: 30.0, lon: 33.0 }] },
  { id: 'VE014', label: 'ASIA-EUROPE', type: 'vessel', speed: 15, waypoints: [{ lat: 29.5, lon: 32.5 }, { lat: 28.0, lon: 34.0 }, { lat: 26.0, lon: 35.0 }] },
  // English Channel
  { id: 'VE015', label: 'DOVER SPIRIT', type: 'vessel', speed: 12, waypoints: [{ lat: 50.9, lon: 1.3 }, { lat: 51.0, lon: 1.0 }, { lat: 51.1, lon: 0.5 }] },
  { id: 'VE016', label: 'CHANNEL FERRY', type: 'vessel', speed: 18, waypoints: [{ lat: 50.8, lon: 1.5 }, { lat: 51.0, lon: 1.2 }, { lat: 51.2, lon: 0.8 }] },
  { id: 'VE017', label: 'NORTH SEA TRADE', type: 'vessel', speed: 14, waypoints: [{ lat: 51.5, lon: 2.0 }, { lat: 52.0, lon: 4.0 }, { lat: 53.0, lon: 6.0 }] },
  { id: 'VE018', label: 'EURO CARGO', type: 'vessel', speed: 13, waypoints: [{ lat: 50.5, lon: 0.5 }, { lat: 49.5, lon: -1.0 }, { lat: 48.0, lon: -4.0 }] },
  // South China Sea
  { id: 'VE019', label: 'PACIFIC GRACE', type: 'vessel', speed: 15, waypoints: [{ lat: 10.0, lon: 115.0 }, { lat: 14.0, lon: 118.0 }, { lat: 18.0, lon: 120.0 }] },
  { id: 'VE020', label: 'SCS PATROL', type: 'vessel', speed: 18, waypoints: [{ lat: 14.5, lon: 117.0 }, { lat: 13.0, lon: 116.0 }, { lat: 11.5, lon: 115.0 }] },
  { id: 'VE021', label: 'CHINA TRADE 1', type: 'vessel', speed: 16, waypoints: [{ lat: 22.0, lon: 114.0 }, { lat: 18.0, lon: 117.0 }, { lat: 14.0, lon: 120.0 }] },
  { id: 'VE022', label: 'CHINA TRADE 2', type: 'vessel', speed: 14, waypoints: [{ lat: 25.0, lon: 119.0 }, { lat: 20.0, lon: 122.0 }, { lat: 16.0, lon: 125.0 }] },
  // Mediterranean
  { id: 'VE023', label: 'MED EXPLORER', type: 'vessel', speed: 13, waypoints: [{ lat: 36.0, lon: 14.5 }, { lat: 37.0, lon: 11.0 }, { lat: 38.0, lon: 8.0 }] },
  { id: 'VE024', label: 'GREEK CARGO', type: 'vessel', speed: 12, waypoints: [{ lat: 37.9, lon: 23.7 }, { lat: 36.0, lon: 20.0 }, { lat: 34.0, lon: 15.0 }] },
  { id: 'VE025', label: 'ITALIAN PORTS', type: 'vessel', speed: 14, waypoints: [{ lat: 40.8, lon: 14.3 }, { lat: 41.9, lon: 12.5 }, { lat: 43.8, lon: 10.4 }] },
  // Baltic Sea
  { id: 'VE026', label: 'BALTIC WIND', type: 'vessel', speed: 11, waypoints: [{ lat: 55.7, lon: 12.6 }, { lat: 57.0, lon: 15.0 }, { lat: 59.3, lon: 18.1 }] },
  { id: 'VE027', label: 'ST PETERSBURG', type: 'vessel', speed: 10, waypoints: [{ lat: 59.9, lon: 30.3 }, { lat: 58.0, lon: 22.0 }, { lat: 56.0, lon: 16.0 }] },
  { id: 'VE028', label: 'GDANSK ROUTE', type: 'vessel', speed: 12, waypoints: [{ lat: 54.4, lon: 18.7 }, { lat: 55.5, lon: 14.0 }, { lat: 56.5, lon: 10.0 }] },
  // West Africa
  { id: 'VE029', label: 'LAGOS CARRIER', type: 'vessel', speed: 12, waypoints: [{ lat: 6.4, lon: 3.4 }, { lat: 5.0, lon: 1.0 }, { lat: 4.0, lon: -2.0 }] },
  { id: 'VE030', label: 'WEST AFRICA', type: 'vessel', speed: 13, waypoints: [{ lat: 5.4, lon: 4.0 }, { lat: 4.5, lon: 2.0 }, { lat: 3.5, lon: 0.0 }] },
  { id: 'VE031', label: 'ANGOLA OIL', type: 'vessel', speed: 11, waypoints: [{ lat: -8.8, lon: 13.2 }, { lat: -6.0, lon: 8.0 }, { lat: -4.0, lon: 4.0 }] },
  // Panama Canal
  { id: 'VE032', label: 'PANAMA TRANS', type: 'vessel', speed: 10, waypoints: [{ lat: 8.9, lon: -79.5 }, { lat: 9.2, lon: -79.8 }, { lat: 9.5, lon: -80.0 }] },
  { id: 'VE033', label: 'PACIFIC-ATL', type: 'vessel', speed: 14, waypoints: [{ lat: 9.0, lon: -79.0 }, { lat: 12.0, lon: -80.0 }, { lat: 15.0, lon: -82.0 }] },
  { id: 'VE034', label: 'CARIBBEAN LNG', type: 'vessel', speed: 13, waypoints: [{ lat: 8.5, lon: -79.0 }, { lat: 10.0, lon: -75.0 }, { lat: 12.0, lon: -71.0 }] },
  // East China Sea / Japan
  { id: 'VE035', label: 'SHANGHAI EXP', type: 'vessel', speed: 16, waypoints: [{ lat: 31.0, lon: 122.0 }, { lat: 33.0, lon: 128.0 }, { lat: 34.0, lon: 130.0 }] },
  { id: 'VE036', label: 'YOKOHAMA TRADE', type: 'vessel', speed: 15, waypoints: [{ lat: 35.4, lon: 139.6 }, { lat: 33.0, lon: 135.0 }, { lat: 30.0, lon: 130.0 }] },
  { id: 'VE037', label: 'BUSAN ROUTE', type: 'vessel', speed: 16, waypoints: [{ lat: 35.1, lon: 129.0 }, { lat: 33.0, lon: 128.0 }, { lat: 31.0, lon: 126.0 }] },
  // Atlantic routes
  { id: 'VE038', label: 'TRANSATLANTIC', type: 'vessel', speed: 15, waypoints: [{ lat: 40.6, lon: -74.0 }, { lat: 45.0, lon: -55.0 }, { lat: 50.0, lon: -5.0 }] },
  { id: 'VE039', label: 'NEW YORK-EU', type: 'vessel', speed: 16, waypoints: [{ lat: 40.7, lon: -74.0 }, { lat: 44.0, lon: -53.0 }, { lat: 48.0, lon: -8.0 }] },
  { id: 'VE040', label: 'BRAZIL TRADE', type: 'vessel', speed: 14, waypoints: [{ lat: -22.9, lon: -43.2 }, { lat: -15.0, lon: -38.0 }, { lat: -8.0, lon: -34.0 }] },
  // Indian Ocean
  { id: 'VE041', label: 'INDIAN CARGO', type: 'vessel', speed: 15, waypoints: [{ lat: 6.9, lon: 79.9 }, { lat: 2.0, lon: 75.0 }, { lat: -2.0, lon: 70.0 }] },
  { id: 'VE042', label: 'MUMBAI TRADE', type: 'vessel', speed: 14, waypoints: [{ lat: 19.0, lon: 72.9 }, { lat: 15.0, lon: 70.0 }, { lat: 11.0, lon: 67.0 }] },
  { id: 'VE043', label: 'COLOMBO PORT', type: 'vessel', speed: 16, waypoints: [{ lat: 6.9, lon: 79.9 }, { lat: 4.0, lon: 77.0 }, { lat: 1.0, lon: 74.0 }] },
  // Australia/Pacific
  { id: 'VE044', label: 'SYDNEY TRADE', type: 'vessel', speed: 15, waypoints: [{ lat: -33.9, lon: 151.2 }, { lat: -30.0, lon: 155.0 }, { lat: -26.0, lon: 159.0 }] },
  { id: 'VE045', label: 'MELBOURNE EXP', type: 'vessel', speed: 14, waypoints: [{ lat: -37.8, lon: 144.9 }, { lat: -34.0, lon: 148.0 }, { lat: -30.0, lon: 152.0 }] },
  { id: 'VE046', label: 'AUCKLAND CARGO', type: 'vessel', speed: 15, waypoints: [{ lat: -36.8, lon: 174.7 }, { lat: -33.0, lon: 170.0 }, { lat: -29.0, lon: 165.0 }] },
  // Arctic/Northern Sea Route
  { id: 'VE047', label: 'ARCTIC LNG', type: 'vessel', speed: 12, waypoints: [{ lat: 70.0, lon: 60.0 }, { lat: 75.0, lon: 80.0 }, { lat: 70.0, lon: 130.0 }] },
  { id: 'VE048', label: 'NORTHERN ROUTE', type: 'vessel', speed: 13, waypoints: [{ lat: 69.0, lon: 33.0 }, { lat: 75.0, lon: 60.0 }, { lat: 70.0, lon: 100.0 }] },
  // Gibraltar and Algeciras
  { id: 'VE049', label: 'GIBRALTAR', type: 'vessel', speed: 14, waypoints: [{ lat: 36.1, lon: -5.3 }, { lat: 36.3, lon: -5.0 }, { lat: 36.5, lon: -4.5 }] },
  { id: 'VE050', label: 'MED-ATLANTIC', type: 'vessel', speed: 15, waypoints: [{ lat: 36.0, lon: -5.5 }, { lat: 38.0, lon: -9.0 }, { lat: 40.0, lon: -12.0 }] },
];

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------

interface SimEntity {
  route: SimRoute;
  /** Current progress along route [0..1]. */
  progress: number;
  /** Speed factor for variation. */
  speedFactor: number;
}

let simEntities: SimEntity[] = [];
let simTimer: ReturnType<typeof setInterval> | null = null;
const SIM_TICK_MS = 1_000;
const SIM_SPEED_MULT = 0.0003; // Controls how fast entities traverse their routes

// ---------------------------------------------------------------------------
// Interpolation helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateRoute(waypoints: Waypoint[], progress: number): Waypoint {
  if (waypoints.length === 1) return waypoints[0];

  const totalSegments = waypoints.length - 1;
  const scaledProgress = progress * totalSegments;
  const segIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segT = scaledProgress - segIndex;

  const from = waypoints[segIndex];
  const to = waypoints[segIndex + 1];

  return {
    lat: lerp(from.lat, to.lat, segT),
    lon: lerp(from.lon, to.lon, segT),
    alt: from.alt !== undefined && to.alt !== undefined
      ? lerp(from.alt, to.alt, segT)
      : from.alt,
  };
}

function headingBetween(from: Waypoint, to: Waypoint): number {
  const dLon = to.lon - from.lon;
  const dLat = to.lat - from.lat;
  const rad = Math.atan2(dLon, dLat);
  return ((rad * 180) / Math.PI + 360) % 360;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if demo mode should be used.
 * Demo mode activates when VITE_DEMO_MODE=true or when no API keys
 * are configured. Set VITE_LIVE_MODE=true to force live connections
 * even without keys (uses free/open feeds).
 */
export function shouldUseDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  if (import.meta.env.VITE_LIVE_MODE === 'true') return false;
  const adsbKey = import.meta.env.VITE_ADSB_API_KEY ?? '';
  const aisKey = import.meta.env.VITE_AIS_API_KEY ?? '';
  return !adsbKey && !aisKey;
}

/**
 * Start the demo simulation, populating the entity store with moving
 * synthetic entities.
 */
export function startSimulation(): void {
  if (simTimer) return;

  // Initialise entities with random starting progress
  simEntities = [...AIRCRAFT_ROUTES, ...VESSEL_ROUTES].map((route) => ({
    route,
    progress: Math.random(),
    speedFactor: 0.8 + Math.random() * 0.4, // 0.8x to 1.2x
  }));

  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'connected');
  store.setServiceStatus('marine-traffic', 'connected');

  console.info('[demoSimulator] Started with', simEntities.length, 'entities');

  simTimer = setInterval(tick, SIM_TICK_MS);
  tick(); // immediate first tick
}

/**
 * Stop the demo simulation.
 */
export function stopSimulation(): void {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'disconnected');
  store.setServiceStatus('marine-traffic', 'disconnected');
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

function tick(): void {
  const store = useEntityStore.getState();
  const now = new Date().toISOString();
  const entities: Entity[] = [];

  for (const sim of simEntities) {
    // Advance progress
    sim.progress += SIM_SPEED_MULT * sim.speedFactor;
    if (sim.progress >= 1) sim.progress -= 1; // loop

    const pos = interpolateRoute(sim.route.waypoints, sim.progress);

    // Compute heading from a small look-ahead
    const aheadProgress = Math.min(sim.progress + 0.01, 0.999);
    const ahead = interpolateRoute(sim.route.waypoints, aheadProgress);
    const heading = headingBetween(pos, ahead);

    // Add small jitter for realism
    const jitterLat = (Math.random() - 0.5) * 0.002;
    const jitterLon = (Math.random() - 0.5) * 0.002;

    const entity: Entity = {
      id: sim.route.id,
      label: sim.route.label,
      type: sim.route.type,
      provider: sim.route.type === 'aircraft' ? 'adsb-exchange' : 'marine-traffic',
      position: {
        lat: pos.lat + jitterLat,
        lon: pos.lon + jitterLon,
        alt: pos.alt,
      },
      heading,
      speed: sim.route.speed * sim.speedFactor,
      lastSeen: now,
    };

    entities.push(entity);
    store.appendTrail(entity.id, {
      lat: entity.position.lat,
      lon: entity.position.lon,
      alt: entity.position.alt,
      ts: now,
    });
  }

  store.upsertEntities(entities);
}
