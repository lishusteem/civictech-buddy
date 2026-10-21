import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const STEP_COUNT = 10;
const BASE_URL = 'http://localhost:3100';

/**
 * `next dev` compiles each route on first hit; compiling several at once while the
 * page is open can make the first run flaky. Hit every route once, one at a time, first.
 */
async function warmRoutes(request: APIRequestContext) {
  const created = await request.post('/api/projects', { data: { name: 'warmup' } });
  const { editToken, slug } = await created.json();
  await request.get('/');
  await request.get(`/e/${editToken}`);
  await request.get(`/api/e/${editToken}`);
  await request.put(`/api/e/${editToken}`, { data: {} });
  for (const route of ['ai', 'alerts', 'summary', 'publish']) {
    await request.post(`/api/e/${editToken}/${route}`, { data: {} });
  }
  await request.get(`/p/${slug}`);
  return { editToken, slug };
}

test.beforeAll(async ({ browser, playwright }) => {
  test.setTimeout(120_000);
  const request = await playwright.request.newContext({ baseURL: BASE_URL });
  const { editToken, slug } = await warmRoutes(request);
  await request.dispose();
  // Load the pages once in a browser too, so client bundles are compiled before the real run.
  const page = await browser.newPage({ baseURL: BASE_URL });
  for (const path of ['/', `/e/${editToken}`, `/p/${slug}`]) {
    await page.goto(path, { waitUntil: 'networkidle' });
  }
  await page.close();
});

/** One step: send an answer, accept the fake proposal if there is one, go to the next step. */
async function completeStep(page: Page) {
  await page.getByLabel('Răspunsul tău').fill('Un răspuns de test.');
  await page.getByRole('button', { name: 'Trimite', exact: true }).click();
  // The fake may answer with a question instead of a proposal (e.g. relations with one actor).
  const acceptAll = page.getByRole('button', { name: 'Acceptă tot' });
  const reply = page.getByRole('listitem').filter({ hasText: /^AI:/ });
  await expect(reply.first()).toBeVisible();
  await expect(page.getByText('AI-ul se gândește…')).toBeHidden();
  if (await acceptAll.isVisible()) {
    await acceptAll.click();
    await expect(acceptAll).toBeHidden();
  }
  await page.getByRole('button', { name: /Pasul următor/ }).click();
}

test('full flow: create, 10 steps, publish, update, conflict', async ({ page, browser }) => {
  // 1. Start
  await page.goto('/');
  await page.getByRole('button', { name: 'Începe un proiect nou' }).click();
  await page.getByRole('button', { name: 'Începe', exact: true }).click();
  await page.waitForURL(/\/e\/[^/]+$/);
  const token = new URL(page.url()).pathname.split('/')[2];

  // 2. Ten steps
  for (let i = 1; i <= STEP_COUNT; i++) {
    await expect(page.getByText(`Pasul ${i} din ${STEP_COUNT}`, { exact: true })).toBeVisible();
    await completeStep(page);
  }

  // 3. Summary -> publish -> keep links
  await expect(page.getByRole('heading', { name: 'Rezumat' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Salvat' })).toBeVisible();
  await page.getByRole('button', { name: 'Publică' }).click();
  await expect(page.getByText('Linkul de editare e singura cheie a proiectului.')).toBeVisible();
  const publicUrlText = await page.locator('p.font-mono').first().textContent();
  const slug = publicUrlText!.trim().split('/p/')[1];
  expect(slug).toBeTruthy();
  await page.getByRole('button', { name: 'Am salvat linkurile' }).click();

  // 4. Public page
  const publicPage = await page.context().newPage();
  await publicPage.goto(`/p/${slug}`);
  await expect(publicPage.getByText('Proiect de test').first()).toBeVisible();

  // 5. Edit the problem, update the public page
  await page.getByRole('navigation', { name: 'Pașii proiectului' }).getByRole('button', { name: /^Problema/ }).click();
  await page.getByRole('region', { name: 'Acceptate' }).getByRole('button', { name: 'Editează' }).click();
  await page.getByLabel('Problema', { exact: true }).fill('Problemă actualizată de test.');
  await page.getByRole('button', { name: 'Salvează' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Salvat' })).toBeVisible();
  await page.getByRole('button', { name: 'Actualizează pagina publică' }).click();
  await expect(page.getByText('Pagina publică a fost actualizată.')).toBeVisible();

  // 6. Public page shows the new text
  await publicPage.reload();
  await expect(publicPage.getByText('Problemă actualizată de test.').first()).toBeVisible();

  // 7. Conflict: a second context edits first, then the first context saves
  const other = await browser.newContext();
  const pageB = await other.newPage();
  await pageB.goto(`/e/${token}`);
  await pageB.getByRole('navigation', { name: 'Pașii proiectului' }).getByRole('button', { name: /^Problema/ }).click();
  await pageB.getByRole('region', { name: 'Acceptate' }).getByRole('button', { name: 'Editează' }).click();
  await pageB.getByLabel('Problema', { exact: true }).fill('Modificare din al doilea context.');
  await pageB.getByRole('button', { name: 'Salvează' }).click();
  await expect(pageB.getByRole('status').filter({ hasText: 'Salvat' })).toBeVisible();

  await page.getByRole('region', { name: 'Acceptate' }).getByRole('button', { name: 'Editează' }).click();
  await page.getByLabel('Problema', { exact: true }).fill('Modificare din primul context.');
  await page.getByRole('button', { name: 'Salvează' }).click();
  await expect(page.getByText('Proiectul a fost modificat în altă parte')).toBeVisible();
  await other.close();
});
