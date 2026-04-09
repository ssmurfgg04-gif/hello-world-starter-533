/**
 * API Health & Resilience Service
 * 
 * Tracks API health, implements circuit breaker pattern,
 * and provides intelligent retry logic with exponential backoff
 */

import { getPrisma } from './dbService';

// Circuit breaker states
type CircuitState = 'closed' | 'open' | 'half-open';

interface ApiEndpoint {
  provider: string;
  endpoint: string;
  state: CircuitState;
  failureCount: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  nextRetry: Date | null;
  // Config
  failureThreshold: number;
  resetTimeoutMs: number;
  baseRetryMs: number;
}

// In-memory circuit breaker registry
const circuits = new Map<string, ApiEndpoint>();

// Default config
const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS = 60000; // 1 minute
const DEFAULT_BASE_RETRY_MS = 1000;

/**
 * Get or create circuit breaker for an API
 */
function getCircuit(provider: string, endpoint?: string): ApiEndpoint {
  const key = `${provider}:${endpoint || 'default'}`;
  
  if (!circuits.has(key)) {
    circuits.set(key, {
      provider,
      endpoint: endpoint || 'default',
      state: 'closed',
      failureCount: 0,
      lastFailure: null,
      lastSuccess: null,
      nextRetry: null,
      failureThreshold: DEFAULT_FAILURE_THRESHOLD,
      resetTimeoutMs: DEFAULT_RESET_TIMEOUT_MS,
      baseRetryMs: DEFAULT_BASE_RETRY_MS,
    });
  }
  
  return circuits.get(key)!;
}

/**
 * Check if API call is allowed (circuit breaker)
 */
export function isApiAllowed(provider: string, endpoint?: string): boolean {
  const circuit = getCircuit(provider, endpoint);
  const now = new Date();
  
  switch (circuit.state) {
    case 'closed':
      return true;
      
    case 'open':
      // Check if we should try half-open
      if (circuit.nextRetry && now >= circuit.nextRetry) {
        circuit.state = 'half-open';
        console.info(`[apiHealth] Circuit half-open for ${provider}`);
        return true;
      }
      return false;
      
    case 'half-open':
      // Allow one test request
      return true;
  }
}

/**
 * Record successful API call
 */
export async function recordSuccess(provider: string, endpoint?: string, responseTimeMs?: number): Promise<void> {
  const circuit = getCircuit(provider, endpoint);
  const now = new Date();
  
  // Reset circuit on success
  if (circuit.state === 'half-open' || circuit.state === 'open') {
    console.info(`[apiHealth] Circuit closed for ${provider} (recovered)`);
  }
  
  circuit.state = 'closed';
  circuit.failureCount = 0;
  circuit.lastSuccess = now;
  circuit.nextRetry = null;
  
  // Persist to database
  try {
    const client = getPrisma();
    await client.apiHealth.create({
      data: {
        provider,
        endpoint,
        status: 'healthy',
        lastSuccess: now,
        avgResponseTime: responseTimeMs,
        checkedAt: now,
      },
    });
  } catch (err) {
    // Don't fail if DB is unavailable
  }
}

/**
 * Record failed API call
 */
export async function recordFailure(provider: string, endpoint?: string, error?: string): Promise<void> {
  const circuit = getCircuit(provider, endpoint);
  const now = new Date();
  
  circuit.failureCount++;
  circuit.lastFailure = now;
  
  // Determine status
  let status: 'error' | 'degraded' | 'rate_limited' = 'error';
  if (error?.includes('429') || error?.includes('rate')) {
    status = 'rate_limited';
  } else if (circuit.failureCount < circuit.failureThreshold / 2) {
    status = 'degraded';
  }
  
  // Open circuit if threshold reached
  if (circuit.failureCount >= circuit.failureThreshold && circuit.state === 'closed') {
    circuit.state = 'open';
    circuit.nextRetry = new Date(now.getTime() + circuit.resetTimeoutMs);
    console.warn(`[apiHealth] Circuit opened for ${provider} (failures: ${circuit.failureCount})`);
  }
  
  // Half-open failure - reopen immediately
  if (circuit.state === 'half-open') {
    circuit.state = 'open';
    circuit.nextRetry = new Date(now.getTime() + circuit.resetTimeoutMs);
    console.warn(`[apiHealth] Circuit re-opened for ${provider} (half-open test failed)`);
  }
  
  // Persist to database
  try {
    const client = getPrisma();
    await client.apiHealth.create({
      data: {
        provider,
        endpoint,
        status,
        lastFailure: now,
        errorCount: circuit.failureCount,
        lastError: error?.substring(0, 500),
        checkedAt: now,
      },
    });
  } catch (err) {
    // Don't fail if DB is unavailable
  }
}

/**
 * Get retry delay for an API (exponential backoff)
 */
export function getRetryDelay(provider: string, endpoint?: string): number {
  const circuit = getCircuit(provider, endpoint);
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s
  const delay = Math.min(
    circuit.baseRetryMs * Math.pow(2, circuit.failureCount),
    60000
  );
  
  return delay;
}

/**
 * Sleep for retry delay
 */
export async function sleepForRetry(provider: string, endpoint?: string): Promise<void> {
  const delay = getRetryDelay(provider, endpoint);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Wrap an API call with health tracking and retry logic
 */
export async function withHealthTracking<T>(
  provider: string,
  endpoint: string,
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    trackResponseTime?: boolean;
  }
): Promise<T | null> {
  const maxRetries = options?.maxRetries ?? 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check circuit breaker
    if (!isApiAllowed(provider, endpoint)) {
      const circuit = getCircuit(provider, endpoint);
      console.warn(`[apiHealth] Circuit open for ${provider}, skipping call`);
      throw new Error(`Circuit breaker open for ${provider}, retry after ${circuit.nextRetry?.toISOString()}`);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      await recordSuccess(provider, endpoint, responseTime);
      return result;
    } catch (err) {
      lastError = err as Error;
      const errorMessage = lastError.message;
      
      await recordFailure(provider, endpoint, errorMessage);
      
      // Don't retry on certain errors
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        throw lastError;
      }
      
      // Wait before retry
      if (attempt < maxRetries - 1) {
        await sleepForRetry(provider, endpoint);
      }
    }
  }
  
  throw lastError || new Error(`All ${maxRetries} retries failed for ${provider}`);
}

/**
 * Get current health status for all APIs
 */
export function getApiHealthStatus(): Array<{
  provider: string;
  state: CircuitState;
  healthy: boolean;
  failureCount: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}> {
  return Array.from(circuits.values()).map(circuit => ({
    provider: circuit.provider,
    state: circuit.state,
    healthy: circuit.state === 'closed',
    failureCount: circuit.failureCount,
    lastSuccess: circuit.lastSuccess,
    lastFailure: circuit.lastFailure,
  }));
}

/**
 * Reset circuit breaker for a provider
 */
export function resetCircuit(provider: string, endpoint?: string): void {
  const key = `${provider}:${endpoint || 'default'}`;
  const circuit = circuits.get(key);
  
  if (circuit) {
    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.nextRetry = null;
    console.info(`[apiHealth] Circuit manually reset for ${provider}`);
  }
}
