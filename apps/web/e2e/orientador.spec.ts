import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousAxeViolations } from "./helpers";

test("anonymous visitors are sent to sign in before reaching the counselor surface", async ({ page }) => {
  await page.goto("/orientador");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Forientador/);
  await expect(page.locator("main")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoSeriousAxeViolations(page);
});

test("the draft review route is also protected", async ({ page }) => {
  await page.goto("/orientador/borrador-1");
  await expect(page).toHaveURL(/\/ingresar/);
});

const counselorState = process.env.E2E_COUNSELOR_STORAGE_STATE;
const candidateState = process.env.E2E_CANDIDATE_STORAGE_STATE;
const REASON = "Revisé la evidencia y la decisión queda documentada.";

test.describe("seeded counselor review", () => {
  test.skip(!counselorState, "Set E2E_COUNSELOR_STORAGE_STATE to a seeded counselor session to run");
  test.use({
    storageState: counselorState ?? { cookies: [], origins: [] },
    viewport: { width: 360, height: 800 },
  });

  test("counselor approves a pending draft from the detail page", async ({ page }) => {
    await page.goto("/orientador");
    await page.locator("main a[href^=\"/orientador/\"]").first().click();
    await expect(page).toHaveURL(/\/orientador\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);

    await page.getByLabel(/Motivo de tu decisión/).fill(REASON);
    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByRole("status")).toHaveText("Aprobaste esta postulación.");
  });

  test("counselor rejects a pending draft with a reason", async ({ page }) => {
    await page.goto("/orientador");
    await page.locator("main a[href^=\"/orientador/\"]").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByLabel(/Motivo de tu decisión/).fill(REASON);
    await page.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByRole("status")).toHaveText("Rechazaste esta postulación.");
  });
});

test.describe("candidate redirect from counselor surface", () => {
  test.skip(!candidateState, "Set E2E_CANDIDATE_STORAGE_STATE to a seeded candidate session to run");
  test.use({
    storageState: candidateState ?? { cookies: [], origins: [] },
    viewport: { width: 360, height: 800 },
  });

  test("a candidate visiting the queue is redirected away from /orientador", async ({ page }) => {
    await page.goto("/orientador");
    await page.waitForURL((url) => url.pathname === "/");
    await expectNoHorizontalScroll(page);
  });

  test("a candidate visiting a draft review is redirected away from /orientador", async ({ page }) => {
    await page.goto("/orientador/borrador-1");
    await page.waitForURL((url) => !url.pathname.startsWith("/orientador"));
    await expectNoHorizontalScroll(page);
  });
});
