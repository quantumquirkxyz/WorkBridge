import { describe, expect, it } from "vitest";
import { ReviewNotFoundError } from "../errors";
import { normalizeVacancy } from "../normalize";
import {
  getExcludedRequirements,
  getPendingReviews,
  getRankableRequirements,
  isVacancyRankable,
  resolveReview,
} from "../ranking";
import type { RawVacancy } from "../types";
import { loadVacancyFixture } from "../../../test/load-fixture";

const now = () => new Date("2026-10-16T12:00:00.000Z");
const options = { now } as const;

const objective = loadVacancyFixture<RawVacancy>("objective.json");
const ageLimit = loadVacancyFixture<RawVacancy>("age-limit.json");
const goodAppearance = loadVacancyFixture<RawVacancy>("good-appearance.json");

async function ageDocument() {
  return normalizeVacancy({ kind: "manual", vacancy: ageLimit }, options);
}

describe("ranking eligibility", () => {
  it("returns every requirement when nothing is flagged", async () => {
    const document = await normalizeVacancy({ kind: "manual", vacancy: objective }, options);
    expect(getRankableRequirements(document)).toHaveLength(document.requirements.length);
    expect(getExcludedRequirements(document)).toEqual([]);
    expect(isVacancyRankable(document)).toBe(true);
  });

  it("excludes flagged requirements from ranking", async () => {
    const document = await ageDocument();
    const rankable = getRankableRequirements(document);

    expect(rankable).toHaveLength(2);
    expect(rankable[0]?.originalWording).toBe("Manejo de Excel");
    expect(getExcludedRequirements(document)).toHaveLength(1);
    expect(getPendingReviews(document)).toHaveLength(1);
  });

  it("marks a blocked vacancy as not rankable", async () => {
    const document = await normalizeVacancy(
      { kind: "manual", vacancy: goodAppearance },
      options,
    );
    expect(isVacancyRankable(document)).toBe(false);
  });
});

describe("resolveReview", () => {
  it("reinstates an approved requirement and clears the review", async () => {
    const document = await ageDocument();
    const review = document.reviewQueue[0];
    expect(review).toBeDefined();

    const resolved = resolveReview(document, {
      reviewId: review!.reviewId,
      decision: "approved",
      reviewer: "counselor@workbridge.pa",
      resolvedAt: "2026-10-16T13:00:00.000Z",
    });

    expect(resolved.status).toBe("accepted");
    expect(resolved.reviewQueue).toEqual([]);
    expect(getRankableRequirements(resolved)).toHaveLength(3);

    const alert = resolved.alerts.find((a) => a.id === review!.alertId);
    expect(alert?.resolved).toBe(true);
    expect(alert?.resolution?.decision).toBe("approved");
    expect(alert?.resolution?.reviewer).toBe("counselor@workbridge.pa");
  });

  it("keeps a rejected requirement excluded from ranking", async () => {
    const document = await ageDocument();
    const review = document.reviewQueue[0]!;

    const resolved = resolveReview(document, {
      reviewId: review.reviewId,
      decision: "rejected",
      reviewer: "counselor@workbridge.pa",
    });

    expect(resolved.status).toBe("accepted");
    expect(getRankableRequirements(resolved)).toHaveLength(2);
    expect(getExcludedRequirements(resolved)).toHaveLength(1);
    const alert = resolved.alerts.find((a) => a.id === review.alertId);
    expect(alert?.resolved).toBe(true);
    expect(alert?.resolution?.decision).toBe("rejected");
  });

  it("does not mutate the original document", async () => {
    const document = await ageDocument();
    const review = document.reviewQueue[0]!;
    resolveReview(document, {
      reviewId: review.reviewId,
      decision: "approved",
      reviewer: "counselor@workbridge.pa",
    });
    expect(document.reviewQueue).toHaveLength(1);
    expect(document.status).toBe("requires_human_review");
  });

  it("throws when the review id is unknown", async () => {
    const document = await ageDocument();
    expect(() =>
      resolveReview(document, {
        reviewId: "review-404",
        decision: "approved",
        reviewer: "counselor@workbridge.pa",
      }),
    ).toThrow(ReviewNotFoundError);
  });
});
