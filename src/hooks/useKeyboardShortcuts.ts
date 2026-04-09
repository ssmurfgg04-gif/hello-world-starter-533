import { useEffect } from 'react';
import { useEntityStore } from '@/store/entityStore';

/**
 * Global keyboard shortcuts for the OSINT platform.
 *
 * Shortcuts:
 *   1 - Toggle aircraft layer
 *   2 - Toggle vessel layer
 *   3 - Toggle satellite layer
 *   4 - Toggle trails
 *   5 - Toggle fusion arcs
 *   6 - Toggle monitoring zones
 *   f - Toggle fullscreen
 *   e - Export data
 *   Escape - Clear entity selection
 *   / - Focus search bar
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Only handle Escape inside inputs
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
          useEntityStore.getState().clearSelection();
        }
        return;
      }

      const store = useEntityStore.getState();

      switch (e.key) {
        case '1':
          store.toggleAircraft();
          break;
        case '2':
          store.toggleVessels();
          break;
        case '3':
          store.toggleSatellites();
          break;
        case '4':
          store.toggleTrails();
          break;
        case '5':
          store.toggleRelations();
          break;
        case '6':
          store.toggleZones();
          break;
        case 'Escape':
          store.clearSelection();
          break;
        case 'f':
        case 'F':
          if (typeof document !== 'undefined') {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }
          break;
        case 'e':
        case 'E': {
          // Trigger export - dispatch custom event
          window.dispatchEvent(new CustomEvent('trigger-export'));
          break;
        }
        case '/': {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Search"]',
          );
          searchInput?.focus();
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
