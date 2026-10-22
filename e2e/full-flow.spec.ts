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

const barPrimary = (page: Page) => page.getByRole('region', { name: 'Acțiunile pasului' }).getByTestId('bar-primary');

/** Waits until the AI asked first (the fake answers with a proposal) and nothing is loading. */
async function waitForFirstTurn(page: Page) {
  const replies = page.getByRole('listitem').filter({ hasText: /^AI:/ });
  await expect(replies.first()).toBeVisible();
  await expect(page.getByText('Pregătesc prima întrebare…')).toBeHidden();
  return replies;
}

/**
 * One step: answer the AI, then a single click on the action bar saves the pending proposals and moves on
 * (state A), or moves on when the step is already complete (state C).
 */
async function completeStep(page: Page) {
  const replies = await waitForFirstTurn(page);
  const before = await replies.count();
  await page.getByLabel('Răspunsul tău').fill('Un răspuns de test.');
  await page.getByRole('button', { name: 'Trimite', exact: true }).click();
  await expect(replies).toHaveCount(before + 1);
  await expect(page.getByText('Mă gândesc…')).toBeHidden();
  await barPrimary(page).click();
}

/** Typing "da" saves the pending proposals without asking the AI; then the bar moves on. */
async function completeStepWithDa(page: Page) {
  const replies = await waitForFirstTurn(page);
  await expect(page.getByRole('region', { name: 'Propuneri în conversație' })).toBeVisible();
  const before = await replies.count();
  const aiCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/ai')) aiCalls.push(r.url());
  });
  await page.getByLabel('Răspunsul tău').fill('da');
  await page.getByRole('button', { name: 'Trimite', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Conversația' }).getByText(/✓ Am salvat \d+ elemente?\. Poți trece la pasul următor\./)).toBeVisible();
  expect(aiCalls).toHaveLength(0);
  await expect(replies).toHaveCount(before);
  await barPrimary(page).click();
}

test('full flow: create, 10 steps, publish, update, conflict', async ({ page, browser }) => {
  // 1. Start
  await page.goto('/');
  await page.getByRole('button', { name: 'Începe un proiect nou' }).click();
  await page.getByRole('button', { name: 'Începe', exact: true }).click();
  await page.waitForURL(/\/e\/[^/]+$/);
  const token = new URL(page.url()).pathname.split('/')[2];
  // A brand-new project shows the edit link once, before step 1.
  await expect(page.getByText('Linkul de editare e singura cheie a proiectului.')).toBeVisible();
  await page.getByRole('button', { name: 'Am salvat linkurile' }).click();

  // 2. Ten steps
  for (let i = 1; i <= STEP_COUNT; i++) {
    await expect(page.getByRole('main').getByText(new RegExp(`^Pasul ${i} din ${STEP_COUNT} · `))).toBeVisible();
    if (i === 2) await completeStepWithDa(page);
    else await completeStep(page);
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
  await page.getByRole('region', { name: 'Salvate' }).getByRole('button', { name: 'Editează' }).click();
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
  await pageB.getByRole('region', { name: 'Salvate' }).getByRole('button', { name: 'Editează' }).click();
  await pageB.getByLabel('Problema', { exact: true }).fill('Modificare din al doilea context.');
  await pageB.getByRole('button', { name: 'Salvează' }).click();
  await expect(pageB.getByRole('status').filter({ hasText: 'Salvat' })).toBeVisible();

  await page.getByRole('region', { name: 'Salvate' }).getByRole('button', { name: 'Editează' }).click();
  await page.getByLabel('Problema', { exact: true }).fill('Modificare din primul context.');
  await page.getByRole('button', { name: 'Salvează' }).click();
  await expect(page.getByText('Proiectul a fost modificat în altă parte')).toBeVisible();
  await other.close();
});

test('mobile 375 px: the action bar is on screen and one click after a proposal opens step 2', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Începe un proiect nou' }).click();
  await page.getByRole('button', { name: 'Începe', exact: true }).click();
  await page.waitForURL(/\/e\/[^/]+$/);
  await page.getByRole('button', { name: 'Am salvat linkurile' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Proiectul și echipa' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Conversația' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('region', { name: 'Propuneri în conversație' })).toBeVisible();
  const primary = barPrimary(page);
  await expect(primary).toBeInViewport();
  await expect(primary).toHaveAccessibleName('Acceptă și treci la pasul următor →');
  await expect(primary).toContainText('Acceptă și treci mai departe →');
  await primary.click();

  await expect(page.getByRole('heading', { level: 1, name: 'Problema' })).toBeVisible();
  await expect(barPrimary(page)).toBeInViewport();
  await page.getByRole('tab', { name: /Rezultatul/ }).click();
  await expect(page.getByRole('region', { name: 'Ce cere pasul' })).toBeVisible();
  await expect(barPrimary(page)).toBeInViewport();
  await context.close();
});
