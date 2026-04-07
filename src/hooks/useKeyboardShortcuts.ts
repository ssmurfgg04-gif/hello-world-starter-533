import { useEffect } from 'react';
import { useEntityStore } from '@/store/entityStore';

/**
 * Global keyboard shortcuts for the OSINT platform.
 *
 * Shortcuts:
 *   1 - Toggle aircraft layer
 *   2 - Toggle vessel layer
 *   3 - Toggle trails
 *   4 - Toggle fusion arcs
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
          store.toggleTrails();
          break;
        case '4':
          store.toggleRelations();
          break;
        case 'Escape':
          store.clearSelection();
          break;
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
