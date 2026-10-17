import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousAxeViolations } from "./helpers";

/**
 * Runs as the seeded employer. Requires a Playwright storage state for that session
 * (E2E_EMPLOYER_STORAGE_STATE) and, for the cross-organization check, the id of a
 * submission that belongs to another organization (E2E_OTHER_ORG_SUBMISSION_ID).
 * Without them the spec is skipped instead of failing against an unseeded backend.
 */
const storageState = process.env.E2E_EMPLOYER_STORAGE_STATE;
const otherOrgSubmission = process.env.E2E_OTHER_ORG_SUBMISSION_ID;

test.use({ viewport: { width: 360, height: 780 }, storageState });

test.describe("employer interview decision", () => {
  test.skip(!storageState, "E2E_EMPLOYER_STORAGE_STATE is not set; seeded employer session required.");

  test("lists pending submissions as cards and decides one as 'No avanza'", async ({ page }) => {
    await page.goto("/empresa");
    await expect(page.getByRole("heading", { name: "Postulaciones" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);

    const cards = page.getByRole("list", { name: "Postulaciones pendientes" }).getByRole("link");
    test.skip((await cards.count()) === 0, "No pending submissions seeded.");

    await cards.first().click();
    await expect(page.getByRole("heading", { name: "Documentos enviados" })).toBeVisible();
    await expect(page.getByText("Evidencia aprobada por la persona")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);

    await page.getByRole("button", { name: "No avanzar" }).click();
    await expect(page.getByText("Escribe un motivo para continuar.")).toBeVisible();

    await page.getByLabel(/Motivo de tu decisión/).fill("Falta experiencia requerida");
    await page.getByRole("button", { name: "No avanzar" }).click();
    await expect(page.getByRole("status")).toContainText("Registramos que la postulación no avanza.");
  });

  test("decides one as 'Pasar a entrevista'", async ({ page }) => {
    await page.goto("/empresa");
    const cards = page.getByRole("list", { name: "Postulaciones pendientes" }).getByRole("link");
    test.skip((await cards.count()) === 0, "No pending submissions seeded.");

    await cards.first().click();
    await expect(page.getByRole("heading", { name: "Documentos enviados" })).toBeVisible();
    await page.getByRole("button", { name: "Aprobar entrevista" }).click();
    await expect(page.getByText("Escribe un motivo para continuar.")).toBeVisible();

    await page.getByLabel(/Motivo de tu decisión/).fill("Cumple el perfil");
    await page.getByRole("button", { name: "Aprobar entrevista" }).click();
    await expect(page.getByRole("status")).toContainText("La postulación pasó a entrevista.");
  });

  test("does not show a submission from another organization", async ({ page }) => {
    test.skip(!otherOrgSubmission, "E2E_OTHER_ORG_SUBMISSION_ID is not set.");

    await page.goto(`/empresa/${encodeURIComponent(otherOrgSubmission ?? "")}`);
    await expect(page.getByRole("alert")).toContainText("Esta postulación no está disponible para tu organización.");
    await expect(page.getByRole("button", { name: "Aprobar entrevista" })).toHaveCount(0);
  });

  test("empty state reads 'No hay postulaciones pendientes' when the queue is empty", async ({ page }) => {
    await page.goto("/empresa");
    const cards = page.getByRole("list", { name: "Postulaciones pendientes" });
    test.skip((await cards.count()) > 0, "Queue is not empty.");
    await expect(page.getByText("No hay postulaciones pendientes")).toBeVisible();
  });
});
