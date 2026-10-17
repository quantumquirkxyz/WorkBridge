import type { RouteEstimate, RoutingPort } from "../src/types";

export interface RouteFixture {
  commuteMinutes: number;
  distanceKm?: number;
  accessible?: boolean;
  source?: RouteEstimate["source"];
  fallbackReason?: string;
}

function toEstimate(fixture: RouteFixture): RouteEstimate {
  return {
    commuteMinutes: fixture.commuteMinutes,
    distanceKm:
      fixture.distanceKm ??
      Number(((fixture.commuteMinutes / 60) * 32).toFixed(2)),
    accessible: fixture.accessible ?? true,
    source: fixture.source ?? "local_matrix",
    ...(fixture.fallbackReason ? { fallbackReason: fixture.fallbackReason } : {}),
  };
}

/** Deterministic routing port that returns the same estimate for every request. */
export function constantRouter(fixture: RouteFixture): RoutingPort {
  return {
    async route(): Promise<RouteEstimate> {
      return toEstimate(fixture);
    },
  };
}

/** Deterministic routing port keyed by destination coordinates. */
export function byDestinationRouter(
  fixtures: Record<string, RouteFixture>,
): RoutingPort {
  return {
    async route(request) {
      const key = `${request.destination.lat},${request.destination.lng}`;
      const fixture = fixtures[key];
      if (!fixture) throw new Error(`No route fixture for destination ${key}.`);
      return toEstimate(fixture);
    },
  };
}
