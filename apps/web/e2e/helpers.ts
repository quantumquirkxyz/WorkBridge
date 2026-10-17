import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const FORBIDDEN_CANDIDATE_TERMS = ["trace", "extractor", "CandidateProfile", "confidence"] as const;

export async function expectNoSeriousAxeViolations(page: Page): Promise<void> {
  const path = new URL(page.url()).pathname || "/";

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.evaluate((scheme) => {
      document.documentElement.classList.toggle("dark", scheme === "dark");
    }, colorScheme);
    if (colorScheme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/);
    } else {
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    }

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(blocking, `axe ${colorScheme} serious/critical violations`).toEqual([]);
  }
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      clientWidth: Math.max(root.clientWidth, body.clientWidth),
    };
  });

  expect(overflow.scrollWidth, "page should not scroll horizontally").toBeLessThanOrEqual(overflow.clientWidth);
}

export async function expectNoTechnicalCandidateVocabulary(page: Page): Promise<void> {
  const text = await page.locator("body").innerText();

  for (const term of FORBIDDEN_CANDIDATE_TERMS) {
    expect(text, `candidate page must not contain "${term}"`).not.toContain(term);
  }
}
