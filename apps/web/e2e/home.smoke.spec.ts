import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeViolations,
  expectNoTechnicalCandidateVocabulary,
} from "./helpers";

test("home page is usable, accessible, and free of technical vocabulary", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Puente Laboral Panamá" })).toBeVisible();

  await expectNoHorizontalScroll(page);
  await expectNoTechnicalCandidateVocabulary(page);
  await expectNoSeriousAxeViolations(page);
});
