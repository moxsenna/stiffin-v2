/**
 * HTTP Adapter Factory Boundary for Backend Integration (Milestone B0/B1)
 * Throws clean Not Implemented Errors until Worker API endpoints are live.
 */

export class HttpApiAdapterNotImplementedError extends Error {
  constructor(featureName: string) {
    super(`[HTTP Adapter] Endpoint backend untuk "${featureName}" belum aktif (Milestone B0/B1). Gunakan Mock Adapter.`);
    this.name = 'HttpApiAdapterNotImplementedError';
  }
}
