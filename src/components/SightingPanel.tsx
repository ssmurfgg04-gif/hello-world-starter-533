/**
 * Sighting Panel - "Dark Fleet" Tracker UI
 * 
 * Displays aircraft-vessel proximity events for investigative use.
 * High-value for maritime insurers and investigative journalists.
 */

import { useState, useEffect, useCallback } from 'react';
import { getRecentSightings, getHighRiskSightings } from '@/services/fusion/sightingDetection';

// Local Sighting type (matches Prisma schema)
interface Sighting {
  id: string;
  entityAId: string;
  entityALabel: string;
  entityBId: string;
  entityBLabel: string;
  distanceKm: number;
  aiRiskScore: number | null;
  aiSummary: string | null;
  detectedAt: Date;
  firstSeen: Date;
}
import { Eye, AlertTriangle, Clock, MapPin, Filter, Search } from 'lucide-react';

export function SightingPanel() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [filter, setFilter] = useState<'all' | 'high-risk'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null);

  const loadSightings = useCallback(async () => {
    setLoading(true);
    try {
      const data = filter === 'high-risk' 
        ? await getHighRiskSightings(0.5)
        : await getRecentSightings(20);
      setSightings(data);
    } catch (err) {
      console.error('[SightingPanel] Failed to load sightings:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSightings();
    const interval = setInterval(loadSightings, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadSightings]);

  // Listen for new sightings
  useEffect(() => {
    const handler = () => loadSightings();
    window.addEventListener('sighting-alert', handler);
    return () => window.removeEventListener('sighting-alert', handler);
  }, [loadSightings]);

  const getRiskColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score > 0.7) return 'text-red-400';
    if (score > 0.5) return 'text-orange-400';
    return 'text-green-400';
  };

  const getRiskBg = (score: number | null) => {
    if (!score) return 'bg-gray-500/10';
    if (score > 0.7) return 'bg-red-500/20';
    if (score > 0.5) return 'bg-orange-500/20';
    return 'bg-green-500/20';
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 w-80 max-h-[400px] overflow-hidden rounded-lg border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white">Sighting Log</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-[10px] rounded ${filter === 'all' ? 'bg-white/20 text-white' : 'text-gray-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high-risk')}
            className={`px-2 py-1 text-[10px] rounded flex items-center gap-1 ${filter === 'high-risk' ? 'bg-red-500/30 text-red-400' : 'text-gray-400'}`}
          >
            <AlertTriangle className="h-3 w-3" />
            Risk
          </button>
        </div>
      </div>

      {/* Sightings List */}
      <div className="max-h-[320px] overflow-y-auto">
        {loading && sightings.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-xs">Loading sightings...</div>
        ) : sightings.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-xs">No sightings detected yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {sightings.map((sighting) => (
              <div
                key={sighting.id}
                onClick={() => setSelectedSighting(sighting)}
                className={`p-3 cursor-pointer hover:bg-white/5 transition-colors ${getRiskBg(sighting.aiRiskScore)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-blue-400 font-medium truncate">
                        {sighting.entityALabel}
                      </span>
                      <span className="text-gray-500">↔</span>
                      <span className="text-teal-400 font-medium truncate">
                        {sighting.entityBLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {sighting.distanceKm.toFixed(1)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(sighting.detectedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {sighting.aiRiskScore && sighting.aiRiskScore > 0.5 && (
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${getRiskColor(sighting.aiRiskScore)}`} />
                  )}
                </div>
                {sighting.aiSummary && (
                  <p className="mt-1 text-[10px] text-gray-400 line-clamp-2">
                    {sighting.aiSummary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSighting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/20 bg-black/90 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Sighting Details</h3>
              <button
                onClick={() => setSelectedSighting(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-500/10 p-2 rounded">
                  <div className="text-blue-400 font-medium">{selectedSighting.entityALabel}</div>
                  <div className="text-gray-400">Aircraft</div>
                </div>
                <div className="bg-teal-500/10 p-2 rounded">
                  <div className="text-teal-400 font-medium">{selectedSighting.entityBLabel}</div>
                  <div className="text-gray-400">Vessel</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-y border-white/10">
                <span className="text-gray-400">Distance</span>
                <span className="text-white font-medium">{selectedSighting.distanceKm.toFixed(2)} km</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-gray-400">Risk Score</span>
                <span className={getRiskColor(selectedSighting.aiRiskScore)}>
                  {selectedSighting.aiRiskScore 
                    ? `${(selectedSighting.aiRiskScore * 100).toFixed(0)}%`
                    : 'N/A'}
                </span>
              </div>
              
              {selectedSighting.aiSummary && (
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-gray-400 mb-1">AI Analysis</div>
                  <p className="text-gray-300">{selectedSighting.aiSummary}</p>
                </div>
              )}
              
              <div className="text-[10px] text-gray-500">
                First seen: {new Date(selectedSighting.firstSeen).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
