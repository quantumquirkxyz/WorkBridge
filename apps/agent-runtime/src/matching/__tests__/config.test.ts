import { describe, expect, it } from "vitest";
import type { Location } from "@workbridge/domain";
import { matchingConfigFromEnv } from "../config";
import { googleFetch, jsonResponse } from "./helpers";

const request = {
  origin: { lat: 8.9833, lng: -79.5167 },
  destination: { lat: 9.0167, lng: -79.4667 },
  mode: "driving" as const,
};

const location: Location = { country: "PA", province: "Panamá", district: "Panamá", raw: null };

describe("matchingConfigFromEnv", () => {
  it("stays offline and warns when no key is configured", async () => {
    const config = matchingConfigFromEnv({});
    expect(config.googleMapsConfigured).toBe(false);
    expect(config.warnings).toHaveLength(1);

    const route = await config.routing.route(request);
    expect(route.source).toBe("local_matrix");

    const geocoded = await config.geocoding.geocode(location);
    expect(geocoded.source).toBe("catalog");
  });

  it("secures Google Maps + Geocoding when the key is present", async () => {
    const config = matchingConfigFromEnv(
      { GOOGLE_MAPS_API_KEY: "test-key" },
      { fetchImpl: googleFetch() },
    );
    expect(config.googleMapsConfigured).toBe(true);
    expect(config.warnings).toEqual([]);

    const route = await config.routing.route(request);
    expect(route.source).toBe("google_maps");
    expect(route.commuteMinutes).toBe(30);

    const geocoded = await config.geocoding.geocode(location);
    expect(geocoded.source).toBe("google_geocoding");
  });

  it("falls back to the local matrix and catalog when Google fails", async () => {
    const failing: typeof fetch = async () => jsonResponse({ status: "REQUEST_DENIED" }, 500);
    const config = matchingConfigFromEnv(
      { GOOGLE_MAPS_API_KEY: "test-key" },
      { fetchImpl: failing },
    );

    const route = await config.routing.route(request);
    expect(route.source).toBe("local_matrix");
    expect(route.fallbackReason).toBeDefined();

    const geocoded = await config.geocoding.geocode(location);
    expect(geocoded.source).toBe("catalog");
    expect(geocoded.fallbackReason).toBeDefined();
  });
});
