/**
 * Audit logger for forensic traceability.
 *
 * Captures significant platform events (connections, disconnections,
 * fusion detections, entity alerts) and persists them to an in-memory
 * ring buffer. Can be extended to ship logs to a remote endpoint or
 * IndexedDB for persistent storage.
 */

export type AuditSeverity = 'info' | 'warn' | 'error';

export interface AuditEntry {
  timestamp: string;
  severity: AuditSeverity;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Ring buffer
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 500;
const entries: AuditEntry[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log an audit event.
 */
export function log(
  severity: AuditSeverity,
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    severity,
    category,
    message,
    data,
  };

  entries.push(entry);

  // Trim to ring buffer size
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  // Also emit to the browser console with appropriate level
  const consoleFn =
    severity === 'error'
      ? console.error
      : severity === 'warn'
        ? console.warn
        : console.info;

  consoleFn(`[AUDIT][${category}] ${message}`, data ?? '');
}

/**
 * Convenience loggers.
 */
export const info = (cat: string, msg: string, data?: Record<string, unknown>) =>
  log('info', cat, msg, data);

export const warn = (cat: string, msg: string, data?: Record<string, unknown>) =>
  log('warn', cat, msg, data);

export const error = (cat: string, msg: string, data?: Record<string, unknown>) =>
  log('error', cat, msg, data);

/**
 * Get all audit entries (newest last).
 */
export function getEntries(): readonly AuditEntry[] {
  return entries;
}

/**
 * Get entries filtered by category and/or severity.
 */
export function query(opts?: {
  category?: string;
  severity?: AuditSeverity;
  since?: string;
}): AuditEntry[] {
  return entries.filter((e) => {
    if (opts?.category && e.category !== opts.category) return false;
    if (opts?.severity && e.severity !== opts.severity) return false;
    if (opts?.since && e.timestamp < opts.since) return false;
    return true;
  });
}

/**
 * Clear the audit log.
 */
export function clear(): void {
  entries.length = 0;
}
