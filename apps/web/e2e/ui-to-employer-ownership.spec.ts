import { expect, test } from "@playwright/test";

/**
 * Seeded browser regression for issue #23. Set E2E_CANDIDATE_STORAGE_STATE,
 * E2E_EMPLOYER_STORAGE_STATE and E2E_CATALOG_VACANCY_ID after running the demo
 * seed; E2E_OTHER_ORG_SUBMISSION_ID is optional for the isolation assertion.
 */
const candidateState = process.env.E2E_CANDIDATE_STORAGE_STATE;
const employerState = process.env.E2E_EMPLOYER_STORAGE_STATE;
const foreignEmployerState = process.env.E2E_FOREIGN_EMPLOYER_STORAGE_STATE;
const vacancyId = process.env.E2E_CATALOG_VACANCY_ID ?? "lnk-1001";
const otherOrgSubmission = process.env.E2E_OTHER_ORG_SUBMISSION_ID;

test.describe("UI to employer ownership", () => {
  test.skip(!candidateState || !employerState, "Seeded candidate and employer storage states are required.");

  test("creates through the UI and preserves catalog ownership", async ({ browser }) => {
    const candidate = await browser.newContext({ storageState: candidateState });
    const candidatePage = await candidate.newPage();
    let draftPayload: Record<string, unknown> | undefined;
    candidatePage.on("request", (request) => {
      if (request.method() !== "POST" || !request.url().endsWith("/api/applications/drafts")) return;
      draftPayload = request.postDataJSON() as Record<string, unknown>;
    });
    await candidatePage.goto(`/postulaciones/nueva?vacancy=${encodeURIComponent(vacancyId)}`);
    await candidatePage.waitForURL(/\/postulaciones\/[^/]+$/);
    expect(draftPayload).toBeDefined();
    expect(draftPayload).not.toHaveProperty("employerOrgId");
    await candidatePage.getByRole("button", { name: "Aprobar mi postulación" }).click();
    await candidatePage.getByRole("button", { name: "Enviar postulación" }).click();
    await candidatePage.getByRole("button", { name: "Sí, enviar" }).click();
    await expect(candidatePage.getByText("Enviamos tu postulación.")).toBeAttached();
    await candidate.close();

    const employer = await browser.newContext({ storageState: employerState });
    const employerPage = await employer.newPage();
    await employerPage.goto("/empresa");
    await expect(employerPage.getByRole("heading", { name: "Postulaciones" })).toBeVisible();
    const submission = employerPage.getByRole("list", { name: "Postulaciones pendientes" }).getByRole("link").filter({ hasText: "Auxiliar" }).first();
    await expect(submission).toBeVisible();
    await submission.click();
    await employerPage.getByRole("button", { name: "Aprobar entrevista" }).click();
    await employerPage.getByLabel(/Motivo de tu decisión/).fill("Perfil acorde");
    await employerPage.getByRole("button", { name: "Aprobar entrevista" }).click();
    await expect(employerPage.getByRole("status")).toContainText("La postulación pasó a entrevista.");
    await employer.close();
  });

  test("keeps a foreign employer out of the submission", async ({ browser }) => {
    test.skip(!foreignEmployerState || !otherOrgSubmission, "Foreign employer storage state and submission id are required.");
    const foreign = await browser.newContext({ storageState: foreignEmployerState });
    const page = await foreign.newPage();
    await page.goto(`/empresa/${encodeURIComponent(otherOrgSubmission ?? "")}`);
    await expect(page.getByRole("alert")).toContainText("Esta postulación no está disponible para tu organización.");
    await foreign.close();
  });
});
