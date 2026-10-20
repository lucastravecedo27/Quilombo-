import { test, expect } from '@playwright/test';

// Ranking nacional y resultados sin trampa: un partido solo vale cuando los 4 confirman.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');
const hoja = (page: import('@playwright/test').Page) => page.locator('.sheet-modal.modal-in');

test('ranking nacional: podio, tabla y mi posición', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await actual(page).locator('button.ranking').click();
  const r = actual(page);
  await expect(r).toHaveAttribute('data-name', 'ranking');
  await expect(r.getByRole('heading', { name: 'Ranking nacional' })).toBeVisible();
  await expect(r.locator('.escalon.p1')).toContainText('Alejandro');
  await expect(r.locator('.fila.yo')).toContainText('Tú');
  await expect(r.locator('.mi-pos')).toContainText(/#\d+/);
  // Filtro por ciudad: solo Medellín
  await r.getByRole('radio', { name: 'Medellín' }).click();
  await expect(r.getByRole('radio', { name: 'Medellín' })).toHaveAttribute('aria-checked', 'true');
  await expect(r.locator('.fila', { hasText: 'Alejandro' })).toHaveCount(0);
  expect(errores).toEqual([]);
});

test('confirmo el resultado que propuso Andrés: queda válido y mueve mis puntos', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  const antes = await actual(page).locator('button.ranking .r-izq span').innerText();
  await actual(page).locator('button.confirmar', { hasText: 'Andrés propuso un resultado' }).click();
  const r = actual(page);
  await expect(r).toHaveAttribute('data-name', 'resultado');
  await expect(r.getByText('3 de 4 confirmaron')).toBeVisible();
  await r.getByRole('button', { name: /Confirmo/ }).click();
  await expect(r.locator('.estado.valido')).toContainText('confirmado por todos');
  await expect(r.locator('.conf', { hasText: 'Tú' }).locator('.pts')).toHaveText(/^-\d+ pts$/);
  await r.getByRole('button', { name: 'Volver' }).click();
  await expect(actual(page).locator('button.confirmar')).toHaveCount(0);
  await expect(actual(page).locator('button.ranking .r-izq span')).not.toHaveText(antes);
  expect(errores).toEqual([]);
});

test('registro el resultado del partido de Juan y los demás lo confirman (demo)', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).locator('.partido .cuerpo').first().click();
  const p = actual(page);
  await expect(p).toHaveAttribute('data-name', 'partido');
  await p.getByRole('button', { name: '🎾 Voy' }).click();
  await p.getByRole('button', { name: /Registrar resultado/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Registrar resultado' })).toBeVisible();
  await expect(hoja(page).locator('.resumen')).toContainText('vs');
  await hoja(page).getByRole('button', { name: 'Enviar para confirmar' }).click();
  const r = actual(page);
  await expect(r).toHaveAttribute('data-name', 'resultado');
  await expect(r.getByText(/1 de 4 confirmaron/)).toBeVisible();
  // Los demás (de mentira en la demo) confirman solos, uno por uno
  await expect(r.locator('.estado.valido')).toBeVisible({ timeout: 15_000 });
  await expect(r.locator('.conf', { hasText: 'Tú' }).locator('.pts')).toHaveText(/^\+\d+ pts$/);
  expect(errores).toEqual([]);
});
