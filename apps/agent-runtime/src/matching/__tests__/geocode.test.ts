import { describe, expect, it } from "vitest";
import type { Location } from "@workbridge/domain";
import {
  DEFAULT_GEO_POINT,
  GeocodingUnavailableError,
  createGeocodingPort,
  createGoogleGeocoder,
  createLocalGeocoder,
} from "../geocode";
import { googleFetch, jsonResponse } from "./helpers";

const location = (
  province: string | null,
  district: string | null,
  raw: string | null = null,
): Location => ({ country: "PA", province, district, raw });

describe("createLocalGeocoder", () => {
  it("resolves a known district to its catalog point", async () => {
    const result = await createLocalGeocoder().geocode(location("Panamá", "Panamá"));
    expect(result.source).toBe("catalog");
    expect(result.matchedOn).toBe("Panamá");
    expect(result.point).toEqual(DEFAULT_GEO_POINT);
  });

  it("matches accent-insensitively", async () => {
    const result = await createLocalGeocoder().geocode(location("Panamá Oeste", "Arraiján"));
    expect(result.source).toBe("catalog");
    expect(result.point).toEqual({ lat: 8.95, lng: -79.65 });
  });

  it("falls back to the province when the district is unknown", async () => {
    const result = await createLocalGeocoder().geocode(location("Chiriquí", "Barú"));
    expect(result.source).toBe("catalog");
    expect(result.matchedOn).toBe("Chiriquí");
  });

  it("scans free-text raw locations deterministically", async () => {
    const result = await createLocalGeocoder().geocode(
      location(null, null, "Buscamos personal para nuestra sede en La Chorrera"),
    );
    expect(result.source).toBe("catalog");
    expect(result.point).toEqual({ lat: 8.8803, lng: -79.7833 });
  });

  it("records an explicit fallback when nothing matches", async () => {
    const result = await createLocalGeocoder().geocode(location(null, null, "Remoto"));
    expect(result).toEqual({ point: DEFAULT_GEO_POINT, source: "default", matchedOn: null });
  });
});

describe("createGoogleGeocoder", () => {
  it("parses a healthy Geocoding response", async () => {
    const geocoder = createGoogleGeocoder({ apiKey: "test-key", fetchImpl: googleFetch() });
    const result = await geocoder.geocode(location("Panamá", "Panamá"));
    expect(result).toEqual({
      point: { lat: 8.99, lng: -79.52 },
      source: "google_geocoding",
      matchedOn: "Ciudad de Panamá, Panamá",
    });
  });

  it("throws when the provider returns ZERO_RESULTS", async () => {
    const geocoder = createGoogleGeocoder({
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ status: "ZERO_RESULTS", results: [] }),
    });
    await expect(geocoder.geocode(location("Panamá", "Panamá"))).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it("throws on an HTTP error", async () => {
    const geocoder = createGoogleGeocoder({
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ status: "REQUEST_DENIED" }, 403),
    });
    await expect(geocoder.geocode(location("Panamá", "Panamá"))).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it("throws without an API key", async () => {
    const geocoder = createGoogleGeocoder({ apiKey: "" });
    await expect(geocoder.geocode(location("Panamá", "Panamá"))).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it("throws when there is no address to geocode", async () => {
    const geocoder = createGoogleGeocoder({ apiKey: "test-key", fetchImpl: googleFetch() });
    await expect(
      geocoder.geocode({ country: "PA", province: null, district: null, raw: null }),
    ).rejects.toBeInstanceOf(GeocodingUnavailableError);
  });
});

describe("createGeocodingPort", () => {
  it("uses the local catalog when Google is not configured", async () => {
    const result = await createGeocodingPort().geocode(location("Panamá", "Panamá"));
    expect(result.source).toBe("catalog");
    expect(result.fallbackReason).toBeUndefined();
  });

  it("prefers Google Geocoding when it succeeds", async () => {
    const google = createGoogleGeocoder({ apiKey: "test-key", fetchImpl: googleFetch() });
    const result = await createGeocodingPort({ google }).geocode(location("Panamá", "Panamá"));
    expect(result.source).toBe("google_geocoding");
    expect(result.point).toEqual({ lat: 8.99, lng: -79.52 });
  });

  it("falls back to the catalog and records why", async () => {
    const google = createGoogleGeocoder({
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ status: "REQUEST_DENIED" }, 500),
    });
    const result = await createGeocodingPort({ google }).geocode(location("Panamá", "Panamá"));
    expect(result.source).toBe("catalog");
    expect(result.fallbackReason).toContain("Google Geocoding");
  });
});
