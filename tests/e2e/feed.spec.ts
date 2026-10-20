import { test, expect, type Page } from '@playwright/test';

// La red social (datos demo): feed en tres partes (fotos, partidos, actividad), scroll infinito e historias.
const actual = (page: Page) => page.locator('.view.tab-active .page-current');
async function red(page: Page) {
  await page.goto('/');
  await expect(actual(page).getByRole('heading', { name: 'Tu red' })).toBeVisible();
}

test('feed: fotos, partidos y actividad; carga más al bajar', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await red(page);
  const p = actual(page);
  await expect(p.getByRole('tab', { name: /Fotos/ })).toHaveAttribute('aria-selected', 'true');
  await expect(p.locator('.feed > .post[data-tipo="publicacion"]').first()).toBeVisible();
  await expect(p.locator('.feed > .post:not([data-tipo="publicacion"])')).toHaveCount(0);
  // Partidos: primero el partido abierto al que me invitaron, luego resultados, ranking y torneos
  await p.getByRole('tab', { name: /Partidos/ }).click();
  await expect(p.locator('.feed > .post').first()).toHaveAttribute('data-tipo', 'partido');
  await expect(p.locator('.marcador').first()).toBeVisible();
  await expect(p.locator('.feed').getByText(/subió a 1\.820 pts/)).toBeVisible();
  // Actividad: de a 8, y al bajar aparecen más
  await p.getByRole('tab', { name: /Actividad/ }).click();
  await expect(p.locator('.feed > .post')).toHaveCount(8);
  await expect(p.locator('.feed > .post[data-tipo="momento"]').first()).toBeVisible();
  await p.locator('.page-content').evaluate((e) => e.scrollTo(0, e.scrollHeight));
  await expect.poll(() => p.locator('.feed > .post').count()).toBeGreaterThan(8);
  expect(errores).toEqual([]);
});

test('feed: reaccionar y comentar una foto', async ({ page }) => {
  await red(page);
  const post = actual(page).locator('.tarjeta-post', { hasText: 'Domingo de pádel' });
  await post.getByRole('button', { name: /^Bandeja/ }).click();
  await expect(post.getByRole('button', { name: 'Bandeja (1)' })).toHaveClass(/mia/);
  await post.getByRole('textbox', { name: 'Comentario' }).fill('¡Vamos con toda!');
  await post.getByRole('button', { name: 'Publicar' }).click();
  await expect(post.getByText('¡Vamos con toda!')).toBeVisible();
});

test('historias: se abren, avanzan con un toque y se cierran', async ({ page }) => {
  await red(page);
  const p = actual(page);
  const nueva = p.locator('.historias button[data-nuevo="true"]').first();
  await expect(nueva).toBeVisible();
  const nombre = (await nueva.locator('small').innerText()).trim();
  await nueva.click();
  const visor = page.getByRole('dialog', { name: new RegExp(`Historias de ${nombre}`) });
  await expect(visor).toBeVisible();
  const llenas = () => visor.locator('.barras b').evaluateAll((bs) => bs.filter((b) => (b as HTMLElement).style.transform === 'scaleX(1)').length);
  const antes = await llenas();
  const caja = (await visor.locator('.zona').boundingBox())!;
  await page.mouse.click(caja.x + caja.width * 0.85, caja.y + caja.height / 2);
  await expect.poll(llenas).toBeGreaterThan(antes);
  await page.keyboard.press('Escape');
  await expect(visor).toBeHidden();
});

test('publicar un resultado: valida los sets y sale en Partidos', async ({ page }) => {
  await red(page);
  await actual(page).getByRole('button', { name: '🎾 Resultado' }).click();
  const hoja = page.locator('.sheet-modal.modal-in');
  await hoja.getByRole('spinbutton', { name: 'Set 1: sus juegos' }).fill('5');
  await expect(hoja.getByText(/Un set va a 6/)).toBeVisible();
  await expect(hoja.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  await hoja.getByRole('spinbutton', { name: 'Set 1: tus juegos' }).fill('7');
  await hoja.getByRole('button', { name: 'Juan' }).first().click();
  await hoja.getByRole('button', { name: 'Publicar' }).click();
  await expect(hoja).toBeHidden();
  await actual(page).getByRole('tab', { name: /Partidos/ }).click();
  await expect(actual(page).locator('.marcador', { hasText: '7-5 · 6-4' })).toBeVisible();
});
