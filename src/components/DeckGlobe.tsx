/**
 * Primary Deck.gl visualisation component.
 *
 * Renders a full-viewport map with configurable layers for aircraft,
 * vessels, trails, and fusion arcs. Uses maplibre-gl as the base-map
 * provider (free, open-source) to avoid any Mapbox token requirement.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import { ScatterplotLayer, ArcLayer, PathLayer, TextLayer, GeoJsonLayer, IconLayer } from '@deck.gl/layers';
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

// Free tile sources (no API key required)
// dark-matter = high contrast dark theme, voyager = detailed but bright, positron = light
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

interface DeckGlobeProps {
  onViewStateRef?: (ref: { centerOnEntity: (lat: number, lon: number) => void }) => void;
}

export function DeckGlobe({ onViewStateRef }: DeckGlobeProps) {
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
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const enabledProviders = useEntityStore((s) => s.enabledProviders);
  const minSpeedFilter = useEntityStore((s) => s.minSpeedFilter);
  const maxEntities = useEntityStore((s) => s.maxEntities);
  const showAircraft = useEntityStore((s) => s.showAircraft);
  const showVessels = useEntityStore((s) => s.showVessels);
  const showSatellites = useEntityStore((s) => s.showSatellites);
  const showTrails = useEntityStore((s) => s.showTrails);
  const showRelations = useEntityStore((s) => s.showRelations);
  const showZones = useEntityStore((s) => s.showZones);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  // Global events store
  const geoEvents = useGlobalEventsStore((s) => s.allGeoEvents);
  const showEarthquakes = useGlobalEventsStore((s) => s.showEarthquakes);
  const showNaturalEvents = useGlobalEventsStore((s) => s.showNaturalEvents);

  // Derived data - filtered by enabled providers, speed, and limited by maxEntities
  const entityArray = useMemo(() => {
    let filtered = Array.from(entities.values()).filter((e) => {
      // Provider filter
      if (!enabledProviders.has(e.provider)) return false;
      // Speed filter (0 means show all)
      if (minSpeedFilter > 0 && e.speed < minSpeedFilter) return false;
      return true;
    });
    // Limit total entities for performance
    if (filtered.length > maxEntities) {
      // Sort by speed (fastest first) and take top maxEntities
      filtered = filtered.sort((a, b) => b.speed - a.speed).slice(0, maxEntities);
    }
    return filtered;
  }, [entities, enabledProviders, minSpeedFilter, maxEntities]);
  const aircraftData = useMemo(() => entityArray.filter((e) => e.type === 'aircraft'), [entityArray]);
  const vesselData = useMemo(() => entityArray.filter((e) => e.type === 'vessel'), [entityArray]);
  const satelliteData = useMemo(() => entityArray.filter((e) => e.type === 'satellite'), [entityArray]);
  
  // Zoom level for clustering decision
  const zoomLevel = viewState.zoom;
  
  const centerOnEntity = useCallback((lat: number, lon: number) => {
    setViewState((prev) => ({ ...prev, latitude: lat, longitude: lon, zoom: 6 }));
  }, []);
  
  useEffect(() => {
    if (onViewStateRef) onViewStateRef({ centerOnEntity });
  }, [onViewStateRef, centerOnEntity]);
  
  // Listen for auto-zoom events from critical notifications
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.lat && detail?.lon) {
        setViewState((prev) => ({ 
          ...prev, 
          latitude: detail.lat, 
          longitude: detail.lon, 
          zoom: 5 
        }));
      }
    };
    window.addEventListener('auto-zoom-to', handler);
    return () => window.removeEventListener('auto-zoom-to', handler);
  }, []);

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

    // Aircraft scatter layer (simple performance optimization at low zoom)
    if (showAircraft && zoomLevel < 4) {
      result.push(
        new ScatterplotLayer({
          id: 'aircraft-simple',
          data: aircraftData,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getFillColor: AIRCRAFT_COLOUR,
          getRadius: 2000,
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          pickable: false,
          updateTriggers: { getPosition: [aircraftData] },
        }),
      );
    }

    // Aircraft icon layer
    if (showAircraft) {
      result.push(
        new IconLayer({
          id: 'aircraft-layer',
          data: aircraftData,
          pickable: true,
          iconAtlas: '/icons/plane.svg',
          iconMapping: {
            plane: { x: 0, y: 0, width: 24, height: 24, mask: false },
          },
          getIcon: () => 'plane',
          getPosition: (d: Entity) => [d.position.lon, d.position.lat, d.position.alt ?? 0],
          getSize: 24,
          sizeMinPixels: 16,
          sizeMaxPixels: 40,
          getAngle: (d: Entity) => d.heading ?? 0,
          angleAlignment: 'map',
          updateTriggers: {
            getPosition: [aircraftData],
            getAngle: [aircraftData],
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

    // Satellite icon layer
    if (showSatellites) {
      result.push(
        new IconLayer({
          id: 'satellite-layer',
          data: satelliteData,
          pickable: true,
          iconAtlas: '/icons/satellite.svg',
          iconMapping: { satellite: { x: 0, y: 0, width: 24, height: 24, mask: false } },
          getIcon: () => 'satellite',
          getPosition: (d: Entity) => [d.position.lon, d.position.lat, d.position.alt ?? 0],
          getSize: 24,
          sizeMinPixels: 16,
          sizeMaxPixels: 40,
          getAngle: (d: Entity) => d.heading ?? 0,
          angleAlignment: 'map',
          updateTriggers: { getPosition: [satelliteData], getAngle: [satelliteData] },
        }),
      );
      result.push(
        new TextLayer({
          id: 'satellite-labels',
          data: satelliteData,
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getText: (d: Entity) => d.label.slice(0, 15),
          getSize: 10,
          getColor: [200, 180, 255, 200],
          getPixelOffset: [0, -14],
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          outlineWidth: 2,
          outlineColor: [0, 0, 0, 200],
          billboard: true,
          updateTriggers: { getPosition: [satelliteData], getText: [satelliteData] },
        }),
      );
    }

    // Vessel icon layer
    if (showVessels) {
      result.push(
        new IconLayer({
          id: 'vessel-layer',
          data: vesselData,
          pickable: true,
          iconAtlas: '/icons/ship.svg',
          iconMapping: { ship: { x: 0, y: 0, width: 24, height: 24, mask: false } },
          getIcon: () => 'ship',
          getPosition: (d: Entity) => [d.position.lon, d.position.lat],
          getSize: 28,
          sizeMinPixels: 18,
          sizeMaxPixels: 44,
          getAngle: (d: Entity) => d.heading ?? 0,
          angleAlignment: 'map',
          updateTriggers: { getPosition: [vesselData], getAngle: [vesselData] },
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

    // Trails - highlight selected entity trail
    const selectedTrail = selectedEntityId ? trails.get(selectedEntityId) : null;
    const selectedTrailPath = selectedTrail && selectedTrail.length > 1 
      ? [{ id: selectedEntityId, path: selectedTrail.map((p) => [p.lon, p.lat]) }] 
      : [];
    
    if (showTrails || selectedTrailPath.length > 0) {
      // Regular trails
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
            updateTriggers: { getPath: [trailPaths] },
          }),
        );
      }
      // Selected entity highlighted trail
      if (selectedTrailPath.length > 0) {
        result.push(
          new PathLayer({
            id: 'selected-trail-layer',
            data: selectedTrailPath,
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: () => [255, 255, 255, 200], // White highlight
            getWidth: 4,
            widthMinPixels: 2,
            widthMaxPixels: 6,
            jointRounded: true,
            capRounded: true,
            updateTriggers: { getPath: [selectedTrailPath] },
          }),
        );
      }
    }

    // GeoJSON exclusion / monitoring zones
    if (showZones) {
      result.push(
        new GeoJsonLayer({
          id: 'exclusion-zones',
          data: EXCLUSION_ZONES,
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
    satelliteData,
    trailPaths,
    arcData,
    earthquakeData,
    naturalEventData,
    entityArray,
    showAircraft,
    showVessels,
    showSatellites,
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
        onViewStateChange={(e: { viewState: MapViewState }) => setViewState(e.viewState)}
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
