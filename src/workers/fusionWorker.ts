/**
 * Web Worker scaffold for the WASM-powered fusion engine.
 *
 * Once the Rust/WASM module is compiled via wasm-pack, this worker will:
 *   1. Load and instantiate the WASM binary.
 *   2. Listen for entity arrays sent from the main thread via postMessage.
 *   3. Invoke the WASM fusion function.
 *   4. Return the results back to the main thread.
 *
 * For now this file serves as a placeholder demonstrating the communication
 * contract. The actual WASM integration will replace the TODO sections below.
 */

// Type definitions for the message protocol
interface FuseRequest {
  type: 'fuse';
  entities: Array<{
    id: string;
    lat: number;
    lon: number;
    alt?: number;
    entityType: string;
    provider: string;
  }>;
}

interface FuseResponse {
  type: 'fuse_result';
  relations: Array<{
    entityIds: [string, string];
    relationType: string;
    confidence: number;
    description: string;
  }>;
  durationMs: number;
}

type WorkerMessage = FuseRequest;

// ---------------------------------------------------------------------------
// WASM initialisation (placeholder)
// ---------------------------------------------------------------------------

// TODO: Once the Rust crate is compiled, import the generated JS glue:
// import init, { fuse_entities } from '../wasm/fusion_engine/pkg/fusion_engine';
//
// let wasmReady = false;
// init().then(() => { wasmReady = true; });

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  if (msg.type === 'fuse') {
    const start = performance.now();

    // TODO: Replace with actual WASM call:
    // const result = fuse_entities(msg.entities);

    // Placeholder: return empty relations
    const response: FuseResponse = {
      type: 'fuse_result',
      relations: [],
      durationMs: performance.now() - start,
    };

    self.postMessage(response);
  }
};

// Signal that the worker is ready
self.postMessage({ type: 'ready' });
