/**
 * GeoJSON exclusion / monitoring zones for the OSINT platform.
 *
 * These represent areas of strategic interest where entity activity
 * is particularly relevant for intelligence analysis.
 */

import type { Feature, FeatureCollection, Polygon } from 'geojson';

export interface ZoneProperties {
  name: string;
  type: 'exclusion' | 'monitoring' | 'chokepoint';
  description: string;
  colour: [number, number, number, number];
}

export const EXCLUSION_ZONES: FeatureCollection<Polygon, ZoneProperties> = {
  type: 'FeatureCollection',
  features: [
    // Strait of Hormuz
    {
      type: 'Feature',
      properties: {
        name: 'Strait of Hormuz',
        type: 'chokepoint',
        description: 'Critical oil transit chokepoint between the Persian Gulf and Gulf of Oman. ~21M barrels/day.',
        colour: [239, 68, 68, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [55.5, 25.5],
          [57.5, 25.5],
          [57.5, 27.0],
          [55.5, 27.0],
          [55.5, 25.5],
        ]],
      },
    },
    // Strait of Malacca
    {
      type: 'Feature',
      properties: {
        name: 'Strait of Malacca',
        type: 'chokepoint',
        description: 'Major shipping lane between the Indian Ocean and South China Sea. ~16M barrels/day.',
        colour: [245, 158, 11, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [99.0, 0.5],
          [104.5, 0.5],
          [104.5, 3.5],
          [99.0, 3.5],
          [99.0, 0.5],
        ]],
      },
    },
    // South China Sea disputed area
    {
      type: 'Feature',
      properties: {
        name: 'South China Sea',
        type: 'monitoring',
        description: 'Disputed maritime region with significant military and commercial traffic.',
        colour: [168, 85, 247, 40],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [108.0, 5.0],
          [121.0, 5.0],
          [121.0, 22.0],
          [108.0, 22.0],
          [108.0, 5.0],
        ]],
      },
    },
    // Suez Canal approach
    {
      type: 'Feature',
      properties: {
        name: 'Suez Canal Zone',
        type: 'chokepoint',
        description: 'Suez Canal and approaches. Critical transit point between Mediterranean and Red Sea.',
        colour: [239, 68, 68, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [31.5, 29.0],
          [33.5, 29.0],
          [33.5, 31.5],
          [31.5, 31.5],
          [31.5, 29.0],
        ]],
      },
    },
    // Bab el-Mandeb
    {
      type: 'Feature',
      properties: {
        name: 'Bab el-Mandeb',
        type: 'chokepoint',
        description: 'Strait between Yemen and Djibouti connecting the Red Sea to the Gulf of Aden.',
        colour: [245, 158, 11, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [42.5, 11.5],
          [44.0, 11.5],
          [44.0, 13.5],
          [42.5, 13.5],
          [42.5, 11.5],
        ]],
      },
    },
    // Taiwan Strait
    {
      type: 'Feature',
      properties: {
        name: 'Taiwan Strait',
        type: 'monitoring',
        description: 'Strategic waterway between Taiwan and mainland China.',
        colour: [168, 85, 247, 40],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [117.5, 22.5],
          [120.5, 22.5],
          [120.5, 26.0],
          [117.5, 26.0],
          [117.5, 22.5],
        ]],
      },
    },
    // English Channel
    {
      type: 'Feature',
      properties: {
        name: 'English Channel',
        type: 'chokepoint',
        description: 'Narrow sea between England and France. One of the busiest shipping lanes globally.',
        colour: [59, 130, 246, 50],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-2.0, 49.5],
          [2.0, 49.5],
          [2.0, 51.5],
          [-2.0, 51.5],
          [-2.0, 49.5],
        ]],
      },
    },
  ],
};
