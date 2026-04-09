/**
 * Global weather data service using Open-Meteo API.
 * 
 * FREE, no API key required, no signup needed.
 * https://open-meteo.com/
 * 
 * Provides current weather conditions for major cities/ports worldwide
 * to correlate with vessel/aircraft movements.
 */

import type { GeoEvent } from '@/types/events';
import { useGlobalEventsStore } from '@/store/globalEventsStore';

const API_URL = 'https://api.open-meteo.com/v1/forecast';
const POLL_INTERVAL_MS = 300_000; // 5 minutes

// Major ports and strategic locations to monitor weather
const WEATHER_LOCATIONS = [
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Strait of Hormuz', lat: 26.5, lon: 56.0 },
  { name: 'Suez Canal', lat: 30.0, lon: 32.5 },
  { name: 'Panama Canal', lat: 9.0, lon: -79.5 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Rotterdam', lat: 51.92, lon: 4.48 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Los Angeles', lat: 33.94, lon: -118.41 },
  { name: 'Hamburg', lat: 53.55, lon: 9.99 },
  { name: 'Dubai', lat: 25.27, lon: 55.29 },
  { name: 'Busan', lat: 35.18, lon: 129.08 },
  { name: 'Hong Kong', lat: 22.32, lon: 114.17 },
  { name: 'Tokyo', lat: 35.68, lon: 139.76 },
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'Santos', lat: -23.96, lon: -46.33 },
  { name: 'Cape Town', lat: -33.92, lon: 18.42 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Piraeus', lat: 37.95, lon: 23.64 },
  { name: 'Antwerp', lat: 51.22, lon: 4.40 },
  { name: 'Felixstowe', lat: 51.96, lon: 1.35 },
];

let pollTimer: ReturnType<typeof setInterval> | null = null;

interface WeatherData {
  latitude: number;
  longitude: number;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
  };
}

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const WEATHER_CODES: Record<number, { description: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = {
  0: { description: 'Clear sky', severity: 'low' },
  1: { description: 'Mainly clear', severity: 'low' },
  2: { description: 'Partly cloudy', severity: 'low' },
  3: { description: 'Overcast', severity: 'low' },
  45: { description: 'Fog', severity: 'medium' },
  48: { description: 'Depositing rime fog', severity: 'medium' },
  51: { description: 'Light drizzle', severity: 'low' },
  53: { description: 'Moderate drizzle', severity: 'low' },
  55: { description: 'Dense drizzle', severity: 'medium' },
  61: { description: 'Slight rain', severity: 'low' },
  63: { description: 'Moderate rain', severity: 'medium' },
  65: { description: 'Heavy rain', severity: 'high' },
  71: { description: 'Slight snow', severity: 'medium' },
  73: { description: 'Moderate snow', severity: 'medium' },
  75: { description: 'Heavy snow', severity: 'high' },
  77: { description: 'Snow grains', severity: 'medium' },
  80: { description: 'Slight rain showers', severity: 'low' },
  81: { description: 'Moderate rain showers', severity: 'medium' },
  82: { description: 'Violent rain showers', severity: 'high' },
  85: { description: 'Slight snow showers', severity: 'medium' },
  86: { description: 'Heavy snow showers', severity: 'high' },
  95: { description: 'Thunderstorm', severity: 'high' },
  96: { description: 'Thunderstorm with hail', severity: 'critical' },
  99: { description: 'Heavy thunderstorm with hail', severity: 'critical' },
};

function getSeverityFromWeather(code: number, windSpeed: number): 'low' | 'medium' | 'high' | 'critical' {
  const base = WEATHER_CODES[code]?.severity ?? 'low';
  // High winds can increase severity
  if (windSpeed > 60) return 'critical';
  if (windSpeed > 40 && base !== 'critical') return 'high';
  if (windSpeed > 25 && base === 'low') return 'medium';
  return base;
}

function createWeatherEvent(location: typeof WEATHER_LOCATIONS[0], data: WeatherData): GeoEvent {
  const code = data.current.weather_code;
  const weatherInfo = WEATHER_CODES[code] ?? { description: 'Unknown', severity: 'low' };
  const severity = getSeverityFromWeather(code, data.current.wind_speed_10m);
  
  return {
    id: `weather-${location.name}-${Date.now()}`,
    title: `${location.name}: ${weatherInfo.description}`,
    type: 'storm',
    lat: location.lat,
    lon: location.lon,
    timestamp: new Date().toISOString(),
    severity,
    source: 'Open-Meteo',
    meta: {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      pressure: data.current.pressure_msl,
      weatherCode: code,
    },
  };
}

async function fetchWeatherForLocation(location: typeof WEATHER_LOCATIONS[0]): Promise<GeoEvent | null> {
  try {
    const url = `${API_URL}?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl`;
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data: WeatherData = await res.json();
    return createWeatherEvent(location, data);
  } catch (err) {
    console.error(`[weatherService] Failed to fetch for ${location.name}:`, err);
    return null;
  }
}

async function fetchAllWeather(): Promise<void> {
  try {
    const events: GeoEvent[] = [];
    
    // Fetch weather for all locations in parallel
    const results = await Promise.all(
      WEATHER_LOCATIONS.map(loc => fetchWeatherForLocation(loc))
    );
    
    for (const event of results) {
      if (event) events.push(event);
    }
    
    // Only add significant weather events (medium severity or higher)
    const significantEvents = events.filter(e => e.severity !== 'low');
    
    if (significantEvents.length > 0) {
      const store = useGlobalEventsStore.getState();
      // Merge with existing natural events
      const existing = store.allGeoEvents.filter(e => e.source !== 'Open-Meteo');
      store.setGeoEvents('weather', [...existing, ...significantEvents]);
      console.info(`[weatherService] Updated ${significantEvents.length} weather alerts`);
    }
  } catch (err) {
    console.error('[weatherService] Fetch failed:', err);
  }
}

export function connect(): void {
  if (pollTimer) return;
  fetchAllWeather();
  pollTimer = setInterval(fetchAllWeather, POLL_INTERVAL_MS);
}

export function disconnect(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
