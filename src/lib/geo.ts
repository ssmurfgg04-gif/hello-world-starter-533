/**
 * Geospatial utility functions used throughout the OSINT platform.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians.
 */
export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 */
export function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Haversine distance between two points in kilometres.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Haversine distance in metres (convenience wrapper).
 */
export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Convert knots to km/h.
 */
export function knotsToKmh(knots: number): number {
  return knots * 1.852;
}

/**
 * Convert metres to feet.
 */
export function metresToFeet(m: number): number {
  return m * 3.28084;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a colour from a normalised value [0..1] using a simple
 * green-to-red gradient. Returns an RGBA tuple suitable for deck.gl.
 */
export function heatColour(t: number): [number, number, number, number] {
  const clamped = clamp(t, 0, 1);
  const r = Math.round(255 * clamped);
  const g = Math.round(255 * (1 - clamped));
  return [r, g, 40, 200];
}
