/**
 * Primary Deck.gl visualisation component.
 *
 * Renders a full-viewport map with configurable layers for aircraft,
 * vessels, trails, and fusion arcs. Uses maplibre-gl as the base-map
 * provider (free, open-source) to avoid any Mapbox token requirement.
 */

import { useCallback, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import { ScatterplotLayer, ArcLayer, PathLayer, TextLayer, GeoJsonLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { MapViewState, PickingInfo, Layer } from '@deck.gl/core';
import { useEntityStore } from '@/store/entityStore';
import { useGlobalEventsStore } from '@/store/globalEventsStore';
import { EntityTooltip } from '@/components/EntityTooltip';
import { EXCLUSION_ZONES } from '@/data/exclusionZones';
import type { Entity } from '@/types/entities';
import type { GeoEvent } from '@/types/events';

import 'maplibre-gl/dist/maplibre-gl.css';

// ---------------------------------------------------------------------------
// Initial viewport: world overview
// ---------------------------------------------------------------------------

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 30,
  latitude: 25,
  zoom: 2.5,
  pitch: 0,
  bearing: 0,
};

// Free tile source (no API key required)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------

const AIRCRAFT_COLOUR: [number, number, number, number] = [59, 130, 246, 220]; // blue-500
const VESSEL_COLOUR: [number, number, number, number] = [20, 184, 166, 220]; // teal-500
const ARC_COLOUR: [number, number, number, number] = [245, 158, 11, 180]; // amber-500
const TRAIL_COLOUR: [number, number, number, number] = [168, 85, 247, 120]; // purple-500

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeckGlobe() {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE);
  const [hoverInfo, setHoverInfo] = useState<{
    entity: Entity;
    x: number;
    y: number;
  } | null>(null);

  // Store selectors
  const entities = useEntityStore((s) => s.entities);
  const trails = useEntityStore((s) => s.trails);
  const relations = useEntityStore((s) => s.relations);
  const showAircraft = useEntityStore((s) => s.showAircraft);
  const showVessels = useEntityStore((s) => s.showVessels);
  const showTrails = useEntityStore((s) => s.showTrails);
  const showRelations = useEntityStore((s) => s.showRelations);
  const showZones = useEntityStore((s) => s.showZones);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  // Global events store
  const geoEvents = useGlobalEventsStore((s) => s.allGeoEvents);
  const showEarthquakes = useGlobalEventsStore((s) => s.showEarthquakes);
  const showNaturalEvents = useGlobalEventsStore((s) => s.showNaturalEvents);

  // Derived data
  const entityArray = useMemo(() => Array.from(entities.values()), [entities]);
  const aircraftData = useMemo(
    () => entityArray.filter((e) => e.type === 'aircraft'),
    [entityArray],
  );
  const vesselData = useMemo(
    () => entityArray.filter((e) => e.type === 'vessel'),
    [entityArray],
  );

  // Trail paths: convert Map<id, TrailPoint[]> -> array of coordinate arrays
  const trailPaths = useMemo(() => {
    const paths: { id: string; path: [number, number][] }[] = [];
    trails.forEach((trail, id) => {
      if (trail.length > 1) {
        paths.push({
          id,
          path: trail.map((p) => [p.lon, p.lat]),
        });
      }
    });
    return paths;
  }, [trails]);

  // Geo events data
  const earthquakeData = useMemo(
    () => geoEvents.filter((e) => e.type === 'earthquake'),
    [geoEvents],
  );
  const naturalEventData = useMemo(
    () => geoEvents.filter((e) => e.type !== 'earthquake'),
    [geoEvents],
  );

  // Arc data for fusion relations
  const arcData = useMemo(() => {
    return relations
      .map((r) => {
        const a = entities.get(r.entityIds[0]);
        const b = entities.get(r.entityIds[1]);
        if (!a || !b) return null;
        return {
          from: [a.position.lon, a.position.lat] as [number, number],
          to: [b.position.lon, b.position.lat] as [number, number],
          confidence: r.confidence,
        };
      })
      .filter(Boolean) as { from: [number, number]; to: [number, number]; confidence: number }[];
  }, [relations, entities]);

  // Hover handler
  const onHover = useCallback(
    (info: PickingInfo) => {
      if (info.object && (info.object as Entity).id) {
        setHoverInfo({
          entity: info.object as Entity,
          x: info.x,
          y: info.y,
        });
      } else {
        setHoverInfo(null);
      }
    },
    [],
  );

  // Click handler -- select entity for detail sidebar
  const onClick = useCallback(
    (info: PickingInfo) => {
      if (info.object && (info.object as Entity).id) {
        selectEntity((info.object as Entity).id);
      }
    },
    [selectEntity],
  );

  // ---------------------------------------------------------------------------
  // Layers
  // ---------------------------------------------------------------------------

  const layers = useMemo(() => {
    const result: Layer[] = [];

    // Aircraft scatterplot
    if (showAircraft) {
      result.push(
        new ScatterplotLayer({
          id: 'aircraft-layer',
          data: aircraftData,
          pickable: true,
          filled: true,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat, d.position.alt ?? 0],
          getFillColor: () => AIRCRAFT_COLOUR,
          getRadius: 6,
          updateTriggers: {
            getPosition: [aircraftData],
          },
        }),
      );

      // Aircraft labels
      result.push(
        new TextLayer({
          id: 'aircraft-labels',
          data: aircraftData,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getText: (d: Entity) => d.label,
          getSize: 11,
          getColor: [200, 200, 220, 200],
          getPixelOffset: [0, -14],
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          outlineWidth: 2,
          outlineColor: [0, 0, 0, 200],
          billboard: true,
          updateTriggers: {
            getPosition: [aircraftData],
            getText: [aircraftData],
          },
        }),
      );
    }

    // Vessel scatterplot
    if (showVessels) {
      result.push(
        new ScatterplotLayer({
          id: 'vessel-layer',
          data: vesselData,
          pickable: true,
          filled: true,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getFillColor: () => VESSEL_COLOUR,
          getRadius: 7,
          updateTriggers: {
            getPosition: [vesselData],
          },
        }),
      );

      result.push(
        new TextLayer({
          id: 'vessel-labels',
          data: vesselData,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getText: (d: Entity) => d.label,
          getSize: 11,
          getColor: [180, 220, 210, 200],
          getPixelOffset: [0, -14],
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          outlineWidth: 2,
          outlineColor: [0, 0, 0, 200],
          billboard: true,
          updateTriggers: {
            getPosition: [vesselData],
            getText: [vesselData],
          },
        }),
      );
    }

    // Trails
    if (showTrails) {
      result.push(
        new PathLayer({
          id: 'trail-layer',
          data: trailPaths,
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: () => TRAIL_COLOUR,
          getWidth: 2,
          widthMinPixels: 1,
          widthMaxPixels: 4,
          jointRounded: true,
          capRounded: true,
          updateTriggers: {
            getPath: [trailPaths],
          },
        }),
      );
    }

    // GeoJSON exclusion / monitoring zones
    if (showZones) {
      result.push(
        new GeoJsonLayer({
          id: 'exclusion-zones',
          data: EXCLUSION_ZONES as any,
          pickable: true,
          stroked: true,
          filled: true,
          getFillColor: (f: any) => f.properties?.colour ?? [100, 100, 100, 40],
          getLineColor: (f: any) => {
            const c = f.properties?.colour ?? [100, 100, 100, 120];
            return [c[0], c[1], c[2], Math.min(c[3] * 3, 255)];
          },
          getLineWidth: 2,
          lineWidthMinPixels: 1,
        }),
      );
    }

    // Fusion arcs
    if (showRelations) {
      result.push(
        new ArcLayer({
          id: 'fusion-arc-layer',
          data: arcData,
          getSourcePosition: (d: { from: [number, number] }) => d.from,
          getTargetPosition: (d: { to: [number, number] }) => d.to,
          getSourceColor: () => ARC_COLOUR,
          getTargetColor: () => ARC_COLOUR,
          getWidth: (d: { confidence: number }) => 1 + d.confidence * 4,
          updateTriggers: {
            getSourcePosition: [arcData],
            getTargetPosition: [arcData],
          },
        }),
      );
    }

    // Earthquake scatterplot (USGS)
    if (showEarthquakes && earthquakeData.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'earthquake-layer',
          data: earthquakeData,
          pickable: true,
          filled: true,
          radiusMinPixels: 5,
          radiusMaxPixels: 30,
          getPosition: (d: GeoEvent) => [d.lon, d.lat],
          getFillColor: (d: GeoEvent) => {
            const mag = d.magnitude ?? 3;
            if (mag >= 6) return [255, 0, 0, 200];
            if (mag >= 5) return [255, 100, 0, 180];
            if (mag >= 4) return [255, 180, 0, 160];
            return [255, 220, 50, 140];
          },
          getRadius: (d: GeoEvent) => ((d.magnitude ?? 3) ** 2) * 500,
          updateTriggers: { getPosition: [earthquakeData] },
        }),
      );
    }

    // Natural events (NASA EONET)
    if (showNaturalEvents && naturalEventData.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'natural-events-layer',
          data: naturalEventData,
          pickable: true,
          filled: true,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          getPosition: (d: GeoEvent) => [d.lon, d.lat],
          getFillColor: (d: GeoEvent) => {
            switch (d.type) {
              case 'wildfire': return [255, 80, 0, 200];
              case 'volcano': return [200, 0, 0, 220];
              case 'storm': return [100, 100, 255, 180];
              case 'flood': return [0, 150, 255, 180];
              case 'iceberg': return [150, 220, 255, 180];
              default: return [180, 180, 180, 160];
            }
          },
          getRadius: 8000,
          updateTriggers: { getPosition: [naturalEventData] },
        }),
      );
    }

    // Entity density heatmap
    if (entityArray.length > 10) {
      result.push(
        new HeatmapLayer({
          id: 'heatmap-layer',
          data: entityArray,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getWeight: 1,
          radiusPixels: 40,
          intensity: 1,
          threshold: 0.05,
          opacity: 0.3,
          updateTriggers: { getPosition: [entityArray] },
        }),
      );
    }

    return result;
  }, [
    aircraftData,
    vesselData,
    trailPaths,
    arcData,
    earthquakeData,
    naturalEventData,
    entityArray,
    showAircraft,
    showVessels,
    showTrails,
    showRelations,
    showZones,
    showEarthquakes,
    showNaturalEvents,
  ]);

  return (
    <div className="deck-globe-container h-full w-full">
      <DeckGL
        viewState={viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        onHover={onHover}
        onClick={onClick}
        getTooltip={() => null}
      >
        <MapGL mapStyle={MAP_STYLE} />
      </DeckGL>

      {hoverInfo && (
        <EntityTooltip
          entity={hoverInfo.entity}
          x={hoverInfo.x}
          y={hoverInfo.y}
        />
      )}
    </div>
  );
}
