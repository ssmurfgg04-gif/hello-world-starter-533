/**
 * Toast notification system for critical alerts.
 * Shows ephemeral notifications for significant events.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGlobalEventsStore } from '@/store/globalEventsStore';
import { useEntityStore } from '@/store/entityStore';

interface Toast {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: number;
}

const SEVERITY_COLORS = {
  critical: 'bg-red-500/90 border-red-400',
  high: 'bg-orange-500/90 border-orange-400',
  medium: 'bg-yellow-500/90 border-yellow-400',
  low: 'bg-blue-500/90 border-blue-400',
};

const TOAST_DURATION_MS = 8000;
const MAX_TOASTS = 5;

export function ToastNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const autoZoomToCritical = useEntityStore((s) => s.autoZoomToCritical);
  const geoEvents = useGlobalEventsStore((s) => s.allGeoEvents);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const id = `${toast.title}-${Date.now()}`;
    setToasts((prev) => {
      const newToasts = [{ ...toast, id, timestamp: Date.now() }, ...prev].slice(0, MAX_TOASTS);
      return newToasts;
    });

    // Auto-remove after duration
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(timeout);
    }, TOAST_DURATION_MS);
    timeoutsRef.current.add(timeout);
  }, []);

  // Monitor for critical/high severity events
  useEffect(() => {
    const criticalEvents = geoEvents.filter(
      (e) => e.severity === 'critical' || e.severity === 'high'
    );

    criticalEvents.forEach((event) => {
      // Only show toast if it's recent (within last 2 minutes)
      const eventTime = new Date(event.timestamp).getTime();
      const ageMinutes = (Date.now() - eventTime) / 60000;
      
      if (ageMinutes < 2) {
        addToast({
          title: event.title,
          message: `${event.type.toUpperCase()} | ${event.source} | Severity: ${event.severity}`,
          severity: event.severity as 'critical' | 'high' | 'medium' | 'low',
        });
        // Auto-zoom to critical events if enabled and event has coordinates
        if (autoZoomToCritical && event.lat !== 0 && event.lon !== 0) {
          window.dispatchEvent(new CustomEvent('auto-zoom-to', { 
            detail: { lat: event.lat, lon: event.lon, title: event.title }
          }));
        }
      }
    });
  }, [geoEvents, addToast, autoZoomToCritical]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative flex w-80 flex-col rounded-lg border px-4 py-3 shadow-xl backdrop-blur-lg text-white ${SEVERITY_COLORS[toast.severity]}`}
          role="alert"
        >
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute right-2 top-2 text-white/70 hover:text-white"
            aria-label="Dismiss"
          >
            ×
          </button>
          <div className="pr-6">
            <div className="font-semibold text-sm">{toast.title}</div>
            <div className="text-xs opacity-90">{toast.message}</div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-0.5 w-full bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/50 animate-[shrink_8s_linear_forwards]" 
              style={{ 
                animationName: 'shrink',
                animationDuration: `${TOAST_DURATION_MS}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards'
              }} 
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
