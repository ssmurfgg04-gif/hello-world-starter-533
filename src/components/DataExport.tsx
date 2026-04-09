/**
 * Data export component for downloading entity data.
 * Supports CSV and JSON formats.
 */

import { useState, useCallback } from 'react';
import { useEntityStore } from '@/store/entityStore';

interface DataExportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataExport({ isOpen, onClose }: DataExportProps) {
  const entities = useEntityStore((s) => s.entities);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const downloadData = useCallback(() => {
    const data = Array.from(entities.values());
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'json') {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint-entities-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV format
      const headers = ['id', 'label', 'type', 'provider', 'lat', 'lon', 'alt', 'heading', 'speed', 'lastSeen'];
      const rows = data.map((e) => [
        e.id,
        e.label,
        e.type,
        e.provider,
        e.position.lat,
        e.position.lon,
        e.position.alt ?? '',
        e.heading,
        e.speed,
        e.lastSeen,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint-entities-${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    onClose();
  }, [entities, format, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-80 rounded-lg border border-border/40 bg-background/95 p-4 shadow-2xl">
        <h3 className="mb-3 text-sm font-bold text-foreground">Export Data</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {entities.size} entities available
        </p>
        
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFormat('csv')}
            className={`flex-1 rounded px-3 py-2 text-xs ${
              format === 'csv' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`flex-1 rounded px-3 py-2 text-xs ${
              format === 'json' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            JSON
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={downloadData}
            disabled={entities.size === 0}
            className="flex-1 rounded bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
