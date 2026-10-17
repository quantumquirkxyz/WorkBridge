import { createGoogleMapsRouter, createRoutingPort, type RoutingPort } from "@puente/solver";
import {
  createGeocodingPort,
  createGoogleGeocoder,
  createLocalGeocoder,
  type GeocodingPort,
} from "./geocode";

/**
 * Runtime configuration for the deterministic matching seam (issue #20).
 *
 * `GOOGLE_MAPS_API_KEY` drives both the Distance Matrix routing port and the
 * Google Geocoding port. When it is absent the runtime stays fully offline: the
 * solver's local matrix provides route estimates and the Panama catalog provides
 * coordinates. A reason is always recorded so the fallback is auditable.
 */

export interface MatchingEnv {
  GOOGLE_MAPS_API_KEY?: string;
  /** Override the Distance Matrix endpoint (tests, self-hosted proxies). */
  GOOGLE_MAPS_ENDPOINT?: string;
  /** Override the Geocoding endpoint (tests, self-hosted proxies). */
  GOOGLE_GEOCODING_ENDPOINT?: string;
}

export interface MatchingRuntimeConfig {
  routing: RoutingPort;
  geocoding: GeocodingPort;
  googleMapsConfigured: boolean;
  warnings: string[];
}

export interface MatchingConfigOptions {
  /** Injected transport so tests exercise the Google path without the network. */
  fetchImpl?: typeof fetch;
}

export function matchingConfigFromEnv(
  env: MatchingEnv = {},
  options: MatchingConfigOptions = {},
): MatchingRuntimeConfig {
  const key = env.GOOGLE_MAPS_API_KEY?.trim();
  const fetchOptions = options.fetchImpl ? { fetchImpl: options.fetchImpl } : {};

  if (!key) {
    return {
      routing: createRoutingPort(),
      geocoding: createGeocodingPort({ local: createLocalGeocoder() }),
      googleMapsConfigured: false,
      warnings: [
        "GOOGLE_MAPS_API_KEY is not set; using the deterministic local matrix and Panama geocoding catalog.",
      ],
    };
  }

  const routing = createRoutingPort({
    google: createGoogleMapsRouter({
      apiKey: key,
      ...fetchOptions,
      ...(env.GOOGLE_MAPS_ENDPOINT ? { endpoint: env.GOOGLE_MAPS_ENDPOINT } : {}),
    }),
  });
  const geocoding = createGeocodingPort({
    google: createGoogleGeocoder({
      apiKey: key,
      ...fetchOptions,
      ...(env.GOOGLE_GEOCODING_ENDPOINT ? { endpoint: env.GOOGLE_GEOCODING_ENDPOINT } : {}),
    }),
  });

  return { routing, geocoding, googleMapsConfigured: true, warnings: [] };
}
