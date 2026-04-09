/**
 * GeoJSON exclusion / monitoring zones for the OSINT platform.
 *
 * These represent areas of strategic interest where entity activity
 * is particularly relevant for intelligence analysis.
 */

export interface ZoneProperties {
  name: string;
  type: 'exclusion' | 'monitoring' | 'chokepoint';
  description: string;
  colour: [number, number, number, number];
}

interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

interface Feature<G = Polygon, P = ZoneProperties> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

interface FeatureCollection<G = Polygon, P = ZoneProperties> {
  type: 'FeatureCollection';
  features: Feature<G, P>[];
}

export const EXCLUSION_ZONES: FeatureCollection = {
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
    // Strait of Gibraltar
    {
      type: 'Feature',
      properties: {
        name: 'Strait of Gibraltar',
        type: 'chokepoint',
        description: 'Gateway between Mediterranean and Atlantic. Critical for European energy imports.',
        colour: [239, 68, 68, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-6.0, 35.8],
          [-4.5, 35.8],
          [-4.5, 36.3],
          [-6.0, 36.3],
          [-6.0, 35.8],
        ]],
      },
    },
    // Panama Canal
    {
      type: 'Feature',
      properties: {
        name: 'Panama Canal',
        type: 'chokepoint',
        description: 'Critical transit between Atlantic and Pacific. ~5% of world trade passes through.',
        colour: [245, 158, 11, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.0, 8.8],
          [-79.5, 8.8],
          [-79.5, 9.5],
          [-80.0, 9.5],
          [-80.0, 8.8],
        ]],
      },
    },
    // Danish Straits
    {
      type: 'Feature',
      properties: {
        name: 'Danish Straits',
        type: 'chokepoint',
        description: 'Connects Baltic Sea to North Sea. Key route for Russian energy exports to Europe.',
        colour: [168, 85, 247, 50],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [10.5, 54.8],
          [13.0, 54.8],
          [13.0, 56.0],
          [10.5, 56.0],
          [10.5, 54.8],
        ]],
      },
    },
    // Turkish Straits
    {
      type: 'Feature',
      properties: {
        name: 'Turkish Straits',
        type: 'chokepoint',
        description: 'Bosporus and Dardanelles. Vital route for Black Sea commerce and energy.',
        colour: [239, 68, 68, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [26.0, 40.0],
          [29.5, 40.0],
          [29.5, 41.5],
          [26.0, 41.5],
          [26.0, 40.0],
        ]],
      },
    },
    // Cape of Good Hope
    {
      type: 'Feature',
      properties: {
        name: 'Cape of Good Hope',
        type: 'chokepoint',
        description: 'Southern Africa bypass route when Suez is disrupted. Critical for global shipping.',
        colour: [59, 130, 246, 50],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [16.0, -36.0],
          [19.0, -36.0],
          [19.0, -33.5],
          [16.0, -33.5],
          [16.0, -36.0],
        ]],
      },
    },
    // Mozambique Channel
    {
      type: 'Feature',
      properties: {
        name: 'Mozambique Channel',
        type: 'monitoring',
        description: 'Between Madagascar and Africa. Key route for Asia-South America trade.',
        colour: [168, 85, 247, 40],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [38.0, -26.0],
          [46.0, -26.0],
          [46.0, -12.0],
          [38.0, -12.0],
          [38.0, -26.0],
        ]],
      },
    },
    // Lombok Strait
    {
      type: 'Feature',
      properties: {
        name: 'Lombok Strait',
        type: 'chokepoint',
        description: 'Deepwater alternative to Malacca for supertankers. Strategic Indonesian passage.',
        colour: [245, 158, 11, 60],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [115.5, -9.0],
          [116.5, -9.0],
          [116.5, -8.0],
          [115.5, -8.0],
          [115.5, -9.0],
        ]],
      },
    },
    // Sunda Strait
    {
      type: 'Feature',
      properties: {
        name: 'Sunda Strait',
        type: 'chokepoint',
        description: 'Between Java and Sumatra. Alternative route to Singapore Strait.',
        colour: [59, 130, 246, 50],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [105.0, -7.0],
          [106.0, -7.0],
          [106.0, -5.5],
          [105.0, -5.5],
          [105.0, -7.0],
        ]],
      },
    },
    // Northwest Passage
    {
      type: 'Feature',
      properties: {
        name: 'Northwest Passage',
        type: 'monitoring',
        description: 'Arctic route connecting Atlantic and Pacific. Increasingly viable with ice melt.',
        colour: [100, 180, 255, 40],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-100.0, 68.0],
          [-95.0, 68.0],
          [-95.0, 75.0],
          [-100.0, 75.0],
          [-100.0, 68.0],
        ]],
      },
    },
    // Northern Sea Route
    {
      type: 'Feature',
      properties: {
        name: 'Northern Sea Route',
        type: 'monitoring',
        description: 'Russian Arctic route along Siberian coast. Shortens Asia-Europe transit significantly.',
        colour: [100, 180, 255, 40],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [40.0, 70.0],
          [180.0, 70.0],
          [180.0, 78.0],
          [40.0, 78.0],
          [40.0, 70.0],
        ]],
      },
    },
    // Drake Passage
    {
      type: 'Feature',
      properties: {
        name: 'Drake Passage',
        type: 'chokepoint',
        description: 'Between South America and Antarctica. Critical for Pacific-Atlantic shipping.',
        colour: [59, 130, 246, 50],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-70.0, -58.0],
          [-60.0, -58.0],
          [-60.0, -54.0],
          [-70.0, -54.0],
          [-70.0, -58.0],
        ]],
      },
    },
    // Torres Strait
    {
      type: 'Feature',
      properties: {
        name: 'Torres Strait',
        type: 'chokepoint',
        description: 'Between Australia and New Guinea. Shallow but critical for Asia-Australia trade.',
        colour: [168, 85, 247, 50],
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [141.0, -10.5],
          [143.0, -10.5],
          [143.0, -9.0],
          [141.0, -9.0],
          [141.0, -10.5],
        ]],
      },
    },
  ],
};
