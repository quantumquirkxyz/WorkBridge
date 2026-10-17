import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { CASOS, CV_TEXTO, type CasoVisual } from './casos';

const CAPTURE_DIR = 'test-results/e2e-web';
const RESPUESTA = { timeout: 45_000 };

function caso(id: CasoVisual['id']): CasoVisual {
  const found = CASOS.find((item) => item.id === id);
  if (!found) throw new Error(`Falta el caso ${id} en el catálogo visual.`);
  return found;
}

async function guardarCaptura(page: Page, id: CasoVisual['id']): Promise<void> {
  const visual = caso(id);
  await page.screenshot({ path: `${CAPTURE_DIR}/${visual.captura}`, fullPage: true });
}

/**
 * One dollar above every published maximum in the cached catalogue.
 * handleExploration with the form defaults and this floor returns noMatch,
 * and roadmapRequested is true because the training checkbox starts checked.
 */
function salarioSinCoincidencia(): number {
  const records = JSON.parse(
    readFileSync(new URL('../../../packages/catalog/fixtures/vacancy-catalog.json', import.meta.url), 'utf8'),
  ) as Array<{ salary?: { maxUsd?: number | null } }>;
  const published = records
    .map((record) => record.salary?.maxUsd)
    .filter((amount): amount is number => typeof amount === 'number');
  if (published.length === 0) {
    throw new Error(
      'El catálogo en caché no publica salarios. Detenerse y preguntar; no cambiar el catálogo para forzar noMatch.',
    );
  }
  return Math.max(...published) + 1;
}

/** The first click can land before Next hydrates and would reload the page. */
async function abrirInicio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(
    () => {
      const field = document.querySelector('#intake-text');
      return field !== null && Object.keys(field).some((key) => key.startsWith('__react'));
    },
    undefined,
    RESPUESTA,
  );
}

function alertaVisible(page: Page, texto: string | RegExp) {
  // Next also mounts an empty route announcer with role="alert".
  return page.getByRole('alert').filter({ hasText: texto });
}

async function buscarVacantes(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Guardar y buscar vacantes' }).click();
  await expect(page.getByRole('button', { name: 'Buscando…' })).toBeHidden(RESPUESTA);
  await expect(page.getByRole('heading', { name: 'Vacantes para ti' })).toBeVisible(RESPUESTA);
}

test('UC-01 pega un CV y muestra perfil, habilidades y experiencias', async ({ page }) => {
  await abrirInicio(page);
  await page.locator('#intake-text').fill(CV_TEXTO);
  await page.getByRole('button', { name: 'Analizar mi perfil' }).click();

  await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible(RESPUESTA);
  await expect(page.getByRole('cell', { name: 'Negocio familiar' })).toBeVisible();
  await expect(page.getByText('trace:')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('postulación enviada');
  await guardarCaptura(page, 'UC-01');
});

test('UC-02 rechaza el texto vacío con un alerta y sin perfil', async ({ page }) => {
  await abrirInicio(page);
  await page.locator('#intake-text').fill('');
  await page.getByRole('button', { name: 'Analizar mi perfil' }).click();

  await expect(alertaVisible(page, /Escribe o pega tu contenido/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resultado' })).toHaveCount(0);
  await guardarCaptura(page, 'UC-02');
});

test('UC-03 guarda las preferencias iniciales y muestra el resultado de la búsqueda', async ({ page }) => {
  await abrirInicio(page);
  await buscarVacantes(page);

  const tabla = page.getByRole('table', { name: /Vacantes compatibles/ });
  const alerta = alertaVisible(page, 'No encontramos una vacante viable');
  await expect(tabla.or(alerta)).toBeVisible();
  if (await tabla.isVisible()) {
    await expect(tabla.locator('tbody tr').first().locator('strong')).not.toHaveText('');
  }
  await guardarCaptura(page, 'UC-03');
});

test('UC-04 explica la falta de vacantes y la ruta cuando el backend la pide', async ({ page }) => {
  const floor = salarioSinCoincidencia();

  await abrirInicio(page);
  const formacion = page.getByRole('checkbox', { name: 'Dispuesto a tomar cursos' });
  await expect(formacion).toBeChecked();
  await page.getByLabel('Salario mínimo (USD/mes)').fill(String(floor));
  await buscarVacantes(page);

  const alerta = alertaVisible(page, 'No encontramos una vacante viable');
  await expect(alerta).toBeVisible();
  await expect(alerta.locator('li').first()).toBeVisible();

  // The handler sets roadmapRequested from willing_to_train. The checkbox is that field.
  if (await formacion.isChecked()) {
    await expect(page.getByRole('heading', { name: 'Ruta de capacitación' })).toBeVisible(RESPUESTA);
    const oportunidad = page.getByRole('table', { name: /Oportunidades recomendadas/ }).locator('tbody tr');
    const sinOportunidad = page.getByText('El catálogo no ofrece una oportunidad elegible');
    await expect(oportunidad.first().or(sinOportunidad)).toBeVisible();
  }
  await guardarCaptura(page, 'UC-04');
});

test('UC-05 guarda la búsqueda y la lista', async ({ page }) => {
  await abrirInicio(page);
  await buscarVacantes(page);
  await expect(page.getByRole('heading', { name: 'Búsquedas guardadas' })).toBeVisible();

  await page.getByLabel('Nombre de la búsqueda').fill('Atención al cliente en Panamá');
  await page.getByRole('button', { name: 'Guardar búsqueda' }).click();

  const panel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Búsquedas guardadas' }) });
  await expect(panel.getByText('Atención al cliente en Panamá', { exact: true })).toBeVisible(RESPUESTA);
  await guardarCaptura(page, 'UC-05');
});

test('UC-06 elimina los datos del candidato y vacía la lista', async ({ page }) => {
  await abrirInicio(page);
  await buscarVacantes(page);
  await page.getByLabel('Nombre de la búsqueda').fill('Atención al cliente en Panamá');
  await page.getByRole('button', { name: 'Guardar búsqueda' }).click();
  await expect(page.getByText('Atención al cliente en Panamá', { exact: true })).toBeVisible(RESPUESTA);

  await page.getByRole('button', { name: 'Eliminar mis datos' }).click();
  await expect(page.getByText('Tus preferencias y búsquedas guardadas fueron eliminadas.')).toBeVisible(RESPUESTA);
  await expect(page.getByText('Atención al cliente en Panamá', { exact: true })).toHaveCount(0);
  await guardarCaptura(page, 'UC-06');
});
