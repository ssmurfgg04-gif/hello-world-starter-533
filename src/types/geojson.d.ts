// Minimal GeoJSON type declarations
// These match the standard GeoJSON specification

declare module 'geojson' {
  export interface Geometry {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  }

  export interface Point extends Geometry {
    type: 'Point';
    coordinates: [number, number] | [number, number, number];
  }

  export interface Polygon extends Geometry {
    type: 'Polygon';
    coordinates: number[][][];
  }

  export interface Feature<G extends Geometry = Geometry, P = Record<string, unknown>> {
    type: 'Feature';
    geometry: G;
    properties: P;
    id?: string | number;
  }

  export interface FeatureCollection<G extends Geometry = Geometry, P = Record<string, unknown>> {
    type: 'FeatureCollection';
    features: Feature<G, P>[];
  }
}
