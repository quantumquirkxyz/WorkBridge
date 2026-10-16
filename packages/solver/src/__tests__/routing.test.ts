import { describe, expect, it } from "vitest";
import { RoutingUnavailableError } from "../errors";
import {
  createGoogleMapsRouter,
  createRoutingPort,
  haversineKm,
  localMatrixRouter,
} from "../routing";
import type { RouteRequest, RoutingPort } from "../types";

const request: RouteRequest = {
  origin: { lat: 8.9833, lng: -79.5167 },
  destination: { lat: 9.0167, lng: -79.4667 },
  mode: "driving",
  requiresAccessible: false,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 8.98, lng: -79.5 }, { lat: 8.98, lng: -79.5 })).toBe(0);
  });

  it("matches a one-degree latitude step", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });
});

describe("localMatrixRouter", () => {
  it("produces a deterministic offline estimate", async () => {
    const first = await localMatrixRouter.route(request);
    const second = await localMatrixRouter.route(request);
    expect(first).toEqual(second);
    expect(first.source).toBe("local_matrix");
    expect(first.accessible).toBe(true);
    expect(first.commuteMinutes).toBeGreaterThan(0);
    expect(first.distanceKm).toBeGreaterThan(0);
  });
});

describe("createGoogleMapsRouter", () => {
  it("parses a healthy Distance Matrix response", async () => {
    const router = createGoogleMapsRouter({
      apiKey: "test-key",
      fetchImpl: async () =>
        jsonResponse({
          status: "OK",
          rows: [
            {
              elements: [
                { status: "OK", duration: { value: 1800 }, distance: { value: 12000 } },
              ],
            },
          ],
        }),
    });
    const estimate = await router.route(request);
    expect(estimate).toEqual({
      commuteMinutes: 30,
      distanceKm: 12,
      accessible: true,
      source: "google_maps",
    });
  });

  it("throws when the provider responds with an error", async () => {
    const router = createGoogleMapsRouter({
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ status: "REQUEST_DENIED" }, 500),
    });
    await expect(router.route(request)).rejects.toBeInstanceOf(RoutingUnavailableError);
  });

  it("throws when no route is returned", async () => {
    const router = createGoogleMapsRouter({
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ status: "OK", rows: [{ elements: [] }] }),
    });
    await expect(router.route(request)).rejects.toBeInstanceOf(RoutingUnavailableError);
  });

  it("throws without an API key", async () => {
    const router = createGoogleMapsRouter({ apiKey: "" });
    await expect(router.route(request)).rejects.toBeInstanceOf(RoutingUnavailableError);
  });
});

describe("createRoutingPort", () => {
  it("uses the local matrix when Google Maps is not configured", async () => {
    const estimate = await createRoutingPort().route(request);
    expect(estimate.source).toBe("local_matrix");
    expect(estimate.fallbackReason).toBeUndefined();
  });

  it("prefers Google Maps when it succeeds", async () => {
    const google: RoutingPort = {
      async route() {
        return { commuteMinutes: 12, distanceKm: 5, accessible: true, source: "local_matrix" };
      },
    };
    const estimate = await createRoutingPort({ google }).route(request);
    expect(estimate.source).toBe("google_maps");
    expect(estimate.commuteMinutes).toBe(12);
  });

  it("falls back to the local matrix and records why", async () => {
    const google: RoutingPort = {
      async route() {
        throw new RoutingUnavailableError("Google Maps request failed.");
      },
    };
    const estimate = await createRoutingPort({ google }).route(request);
    expect(estimate.source).toBe("local_matrix");
    expect(estimate.fallbackReason).toBe("Google Maps request failed.");
  });
});
