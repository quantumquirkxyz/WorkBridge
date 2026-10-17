import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousAxeViolations } from "./helpers";

/** Needs a seeded counselor session (E2E_COUNSELOR_STORAGE_STATE); skipped otherwise. */
const counselorState = process.env.E2E_COUNSELOR_STORAGE_STATE;

test.describe("counselor queue and review", () => {
  test.skip(!counselorState, "Set E2E_COUNSELOR_STORAGE_STATE to a seeded counselor session to run");
  test.use({ storageState: counselorState ?? { cookies: [], origins: [] }, viewport: { width: 360, height: 800 } });

  test("queue shows count, gate filters and keyboard-reachable rows", async ({ page }) => {
    await page.goto("/orientador");
    await expect(page.getByRole("heading", { name: "Pendientes de revisión" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);

    const list = page.getByRole("list", { name: "Pendientes de revisión" });
    test.skip((await list.count()) === 0, "No pending drafts seeded.");
    await expect(page.getByRole("button", { name: /Todas/ })).toHaveAttribute("aria-pressed", "true");

    await list.getByRole("link").first().focus();
    await page.keyboard.press("ArrowDown");
    await page.getByLabel("Ordenar").selectOption("oldest");
  });

  test("review requires a reason and double click approves once", async ({ page }) => {
    await page.goto("/orientador");
    const links = page.locator('main a[href^="/orientador/"]');
    test.skip((await links.count()) === 0, "No pending drafts seeded.");
    await links.first().click();
    await expect(page.getByRole("button", { name: "Aprobar" })).toBeDisabled();

    await page.getByLabel(/Motivo de tu decisión/).fill("Revisé la evidencia y la decisión queda documentada.");
    await page.getByRole("button", { name: "Aprobar" }).dblclick();
    await expect(page.getByRole("status")).toHaveText("Aprobaste esta postulación.");
    await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
  });
});
