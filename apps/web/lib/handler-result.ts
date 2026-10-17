/**
 * The shape every web API handler returns: an HTTP status and a serialisable
 * body. Shared so the routes agree on one contract instead of each handler
 * declaring its own.
 */
export interface HandlerResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}
