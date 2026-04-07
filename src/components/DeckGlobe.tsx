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
import { ScatterplotLayer, ArcLayer, PathLayer, TextLayer } from '@deck.gl/layers';
import type { MapViewState, PickingInfo, Layer } from '@deck.gl/core';
import { useEntityStore } from '@/store/entityStore';
import { EntityTooltip } from '@/components/EntityTooltip';
import type { Entity } from '@/types/entities';

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

    return result;
  }, [
    aircraftData,
    vesselData,
    trailPaths,
    arcData,
    showAircraft,
    showVessels,
    showTrails,
    showRelations,
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
