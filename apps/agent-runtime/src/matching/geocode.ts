import { normalizeText, type Location } from "@puente/domain";
import type { GeoPoint } from "@puente/solver";

/**
 * Geocoding seam for the runtime → solver integration (issue #20).
 *
 * The domain `Location` is textual (`{ country, province, district, raw }`)
 * while the solver needs a `GeoPoint { lat, lng }`. This module bridges the two
 * behind a `GeocodingPort` so the matching layer never guesses a coordinate:
 * a deterministic Panama catalog is the offline default, and the Google
 * Geocoding API is used when a key is configured.
 */

/** Panama City centre; also the solver's fixture point and the last-resort fallback. */
export const DEFAULT_GEO_POINT: GeoPoint = { lat: 8.9833, lng: -79.5167 };

export type GeocodeSource = "catalog" | "google_geocoding" | "default";

export interface GeocodeResult {
  point: GeoPoint;
  source: GeocodeSource;
  /** Catalog key or provider `formatted_address` that produced the point. */
  matchedOn: string | null;
  /** Present when Google Geocoding was configured but the local catalog answered. */
  fallbackReason?: string;
}

export interface GeocodingPort {
  geocode(location: Location): Promise<GeocodeResult>;
}

export class GeocodingUnavailableError extends Error {
  readonly code = "geocoding_unavailable";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GeocodingUnavailableError";
  }
}

interface LocationEntry {
  /** Human-readable label for reasons and audit records. */
  label: string;
  point: GeoPoint;
  /** Normalized lookup keys (district and/or province names). */
  keys: string[];
}

/**
 * Deterministic Panama catalog. Coordinates are district/province centroids for
 * the Panama Metro and Panama Oeste target regions plus the main provincial
 * capitals, so an offline run still produces a stable, explainable point.
 */
export const PANAMA_LOCATIONS: readonly LocationEntry[] = [
  { label: "Ciudad de Panamá", point: { lat: 8.9833, lng: -79.5167 }, keys: ["panama", "ciudad de panama"] },
  { label: "San Miguelito", point: { lat: 9.0333, lng: -79.5 }, keys: ["san miguelito"] },
  { label: "Tocumen", point: { lat: 9.0833, lng: -79.3833 }, keys: ["tocumen"] },
  { label: "Arraiján", point: { lat: 8.95, lng: -79.65 }, keys: ["arraijan"] },
  { label: "La Chorrera", point: { lat: 8.8803, lng: -79.7833 }, keys: ["la chorrera", "chorrera", "panama oeste"] },
  { label: "Colón", point: { lat: 9.3592, lng: -79.9014 }, keys: ["colon"] },
  { label: "David", point: { lat: 8.4273, lng: -82.4309 }, keys: ["david", "chiriqui"] },
  { label: "Santiago", point: { lat: 8.1, lng: -80.9833 }, keys: ["santiago", "veraguas"] },
  { label: "Chitré", point: { lat: 7.9667, lng: -80.4333 }, keys: ["chitre", "herrera"] },
  { label: "Las Tablas", point: { lat: 7.7667, lng: -80.2833 }, keys: ["las tablas", "los santos"] },
  { label: "Penonomé", point: { lat: 8.5167, lng: -80.35 }, keys: ["penonome", "cocle"] },
  { label: "Aguadulce", point: { lat: 8.2417, lng: -80.5333 }, keys: ["aguadulce"] },
  { label: "La Palma", point: { lat: 8.405, lng: -77.94 }, keys: ["la palma", "darien"] },
  { label: "Changuinola", point: { lat: 9.4333, lng: -82.5167 }, keys: ["changuinola", "bocas del toro"] },
] as const;

function buildIndex(entries: readonly LocationEntry[]): Map<string, LocationEntry> {
  const index = new Map<string, LocationEntry>();
  for (const entry of entries) {
    for (const key of entry.keys) {
      const normalized = normalizeText(key);
      if (normalized.length > 0 && !index.has(normalized)) index.set(normalized, entry);
    }
  }
  return index;
}

interface CatalogMatch {
  entry: LocationEntry;
  matchedOn: string;
}

/**
 * Look up a point: an exact district, then province, then a whole-word scan of
 * the free-text `raw` field. Ties on the raw scan prefer the longest key, so the
 * result never depends on map iteration order or input order.
 */
function lookupLocation(
  index: Map<string, LocationEntry>,
  location: Location,
): CatalogMatch | null {
  for (const field of [location.district, location.province]) {
    if (!field) continue;
    const entry = index.get(normalizeText(field));
    if (entry) return { entry, matchedOn: field };
  }

  if (location.raw) {
    const haystack = ` ${normalizeText(location.raw)} `;
    let best: CatalogMatch | null = null;
    for (const [key, entry] of index) {
      if (key.length < 4) continue;
      if (!haystack.includes(` ${key} `)) continue;
      if (best === null || key.length > best.matchedOn.length) {
        best = { entry, matchedOn: key };
      }
    }
    if (best) return best;
  }

  return null;
}

/** Deterministic, offline geocoder backed by the Panama catalog. */
export function createLocalGeocoder(
  entries: readonly LocationEntry[] = PANAMA_LOCATIONS,
): GeocodingPort {
  const index = buildIndex(entries);
  return {
    async geocode(location: Location): Promise<GeocodeResult> {
      const match = lookupLocation(index, location);
      if (match) {
        return { point: { ...match.entry.point }, source: "catalog", matchedOn: match.matchedOn };
      }
      return { point: { ...DEFAULT_GEO_POINT }, source: "default", matchedOn: null };
    },
  };
}

interface GeocodeApiResponse {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
}

export interface GoogleGeocoderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Geocoding endpoint; overridable so tests never hit the network. */
  endpoint?: string;
}

function addressFor(location: Location): string {
  if (location.raw?.trim()) return location.raw.trim();
  const parts = [location.district, location.province].filter((part): part is string =>
    Boolean(part && part.trim()),
  );
  if (parts.length === 0) return "";
  if (location.country?.trim()) parts.push(location.country.trim());
  return parts.join(", ");
}

/**
 * Google Geocoding adapter. It throws `GeocodingUnavailableError` on a
 * transport, HTTP, or provider error so a composing port can fall back to the
 * local catalog.
 */
export function createGoogleGeocoder({
  apiKey,
  fetchImpl,
  endpoint = "https://maps.googleapis.com/maps/api/geocode/json",
}: GoogleGeocoderOptions): GeocodingPort {
  const doFetch = fetchImpl ?? fetch;

  return {
    async geocode(location: Location): Promise<GeocodeResult> {
      if (!apiKey) {
        throw new GeocodingUnavailableError("No Google Geocoding API key configured.");
      }
      const address = addressFor(location);
      if (!address) {
        throw new GeocodingUnavailableError("The location has no address to geocode.");
      }

      const url = new URL(endpoint);
      url.searchParams.set("address", address);
      url.searchParams.set("key", apiKey);

      let response: Response;
      try {
        response = await doFetch(url);
      } catch (error) {
        throw new GeocodingUnavailableError("Google Geocoding request failed.", { cause: error });
      }
      if (!response.ok) {
        throw new GeocodingUnavailableError(
          `Google Geocoding responded with HTTP ${response.status}.`,
        );
      }

      const data = (await response.json()) as GeocodeApiResponse;
      const result = data.results?.[0];
      const point = result?.geometry?.location;
      if (
        data.status !== "OK" ||
        !point ||
        typeof point.lat !== "number" ||
        typeof point.lng !== "number"
      ) {
        throw new GeocodingUnavailableError(
          `Google Geocoding returned no point (status ${data.status ?? "UNKNOWN"}).`,
        );
      }

      return {
        point: { lat: point.lat, lng: point.lng },
        source: "google_geocoding",
        matchedOn: result?.formatted_address ?? address,
      };
    },
  };
}

export interface GeocodingPortOptions {
  google?: GeocodingPort;
  local?: GeocodingPort;
}

/**
 * Compose the production geocoding port: Google Geocoding when configured, and
 * the deterministic local catalog on any failure, recording why in
 * `fallbackReason`.
 */
export function createGeocodingPort({
  google,
  local = createLocalGeocoder(),
}: GeocodingPortOptions = {}): GeocodingPort {
  return {
    async geocode(location: Location): Promise<GeocodeResult> {
      if (!google) return local.geocode(location);
      try {
        return await google.geocode(location);
      } catch (error) {
        const fallback = await local.geocode(location);
        const reason =
          error instanceof Error ? error.message : "Google Geocoding failed.";
        return { ...fallback, source: fallback.source, fallbackReason: reason };
      }
    },
  };
}
