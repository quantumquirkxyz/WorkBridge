import { RoutingUnavailableError } from "./errors";
import type {
  GeoPoint,
  RouteEstimate,
  RouteRequest,
  RoutingPort,
  TransportMode,
} from "./types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ratio of road distance to straight-line distance for the Panama Metro area. */
const URBAN_ROAD_FACTOR = 1.35;

const SPEED_KMH: Readonly<Record<TransportMode, number>> = {
  driving: 32,
  transit: 20,
  walking: 4.8,
  cycling: 14,
};

/**
 * Offline routing fallback. It uses a straight-line distance with a fixed urban
 * road factor and an average speed per mode, so the solver stays deterministic
 * and usable when Google Maps is unavailable.
 */
export const localMatrixRouter: RoutingPort = {
  async route(request: RouteRequest): Promise<RouteEstimate> {
    const straightLineKm = haversineKm(request.origin, request.destination);
    const distanceKm = Number((straightLineKm * URBAN_ROAD_FACTOR).toFixed(2));
    const speed = SPEED_KMH[request.mode];
    const commuteMinutes = Math.round((distanceKm / speed) * 60);
    return {
      commuteMinutes,
      distanceKm,
      accessible: true,
      source: "local_matrix",
    };
  },
};

interface DistanceMatrixElement {
  status?: string;
  duration?: { value?: number };
  distance?: { value?: number };
}

interface DistanceMatrixResponse {
  status?: string;
  rows?: { elements?: DistanceMatrixElement[] }[];
}

export interface GoogleMapsRouterOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Distance Matrix endpoint; overridable so tests never hit the network. */
  endpoint?: string;
}

/**
 * Google Maps Distance Matrix adapter. It throws `RoutingUnavailableError` on a
 * transport, HTTP, or provider error so a composing port can fall back to the
 * local matrix.
 */
export function createGoogleMapsRouter({
  apiKey,
  fetchImpl,
  endpoint = "https://maps.googleapis.com/maps/api/distancematrix/json",
}: GoogleMapsRouterOptions): RoutingPort {
  const doFetch = fetchImpl ?? fetch;

  return {
    async route(request: RouteRequest): Promise<RouteEstimate> {
      if (!apiKey) {
        throw new RoutingUnavailableError("No Google Maps API key configured.");
      }
      const url = new URL(endpoint);
      url.searchParams.set("origins", `${request.origin.lat},${request.origin.lng}`);
      url.searchParams.set(
        "destinations",
        `${request.destination.lat},${request.destination.lng}`,
      );
      url.searchParams.set("mode", request.mode);
      url.searchParams.set("units", "metric");
      url.searchParams.set("key", apiKey);

      let response: Response;
      try {
        response = await doFetch(url);
      } catch (error) {
        throw new RoutingUnavailableError("Google Maps request failed.", error);
      }
      if (!response.ok) {
        throw new RoutingUnavailableError(
          `Google Maps responded with HTTP ${response.status}.`,
        );
      }

      const data = (await response.json()) as DistanceMatrixResponse;
      const element = data.rows?.[0]?.elements?.[0];
      if (!element || (element.status && element.status !== "OK") || !element.duration?.value) {
        throw new RoutingUnavailableError(
          `Google Maps returned no route (status ${element?.status ?? data.status ?? "UNKNOWN"}).`,
        );
      }

      const distanceKm = Number(((element.distance?.value ?? 0) / 1000).toFixed(2));
      return {
        commuteMinutes: Math.round(element.duration.value / 60),
        distanceKm,
        accessible: true,
        source: "google_maps",
      };
    },
  };
}

export interface RoutingPortOptions {
  google?: RoutingPort;
  local?: RoutingPort;
}

/**
 * Compose the production routing port: use Google Maps when configured, and
 * fall back to the local matrix on any failure, recording why. Geographic
 * reasons therefore always have an estimate to explain.
 */
export function createRoutingPort({
  google,
  local = localMatrixRouter,
}: RoutingPortOptions = {}): RoutingPort {
  return {
    async route(request: RouteRequest): Promise<RouteEstimate> {
      if (!google) {
        const fallback = await local.route(request);
        return {
          ...fallback,
          source: "local_matrix",
          fallbackReason: "Google Maps is not configured; using the local matrix.",
        };
      }
      try {
        const estimate = await google.route(request);
        return { ...estimate, source: "google_maps", fallbackReason: undefined };
      } catch (error) {
        const fallback = await local.route(request);
        const reason =
          error instanceof Error ? error.message : "Google Maps routing failed.";
        return { ...fallback, source: "local_matrix", fallbackReason: reason };
      }
    },
  };
}
