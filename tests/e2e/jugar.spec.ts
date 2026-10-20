import { test, expect } from '@playwright/test';

// Jugar: ver canchas libres en la ciudad, invitar a jugar apartando una, dividir y pagar la cancha, y entrar a un torneo.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');

test('reservar una cancha libre con mi gente, dividirla y pagarla', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  const p = actual(page);
  await expect(p.getByRole('heading', { name: 'Jugar' })).toBeVisible();
  // Mi ciudad (Medellín) y mañana
  await expect(p.getByRole('tab', { name: '📍 Medellín' })).toHaveAttribute('aria-selected', 'true');
  await p.getByRole('tab', { name: 'Mañana' }).click();
  const franja = p.locator('.franja').first();
  await expect(franja).toBeVisible();
  const club = (await franja.locator('.club').innerText()).trim();
  await franja.click();

  const hoja = page.locator('.sheet-modal.modal-in');
  await expect(hoja.getByRole('heading', { name: 'Reservar cancha' })).toBeVisible();
  await expect(hoja.getByText(club)).toBeVisible();
  await expect(hoja.getByText(/90 min/)).toBeVisible();
  await hoja.getByRole('button', { name: 'Juan', exact: true }).click();
  await hoja.getByRole('button', { name: 'Caro', exact: true }).click();
  await hoja.getByRole('button', { name: 'Apartar (pagas después)' }).click();

  // Queda la reserva apartada, con plazo para pagar
  await expect(actual(page)).toHaveAttribute('data-name', 'partido');
  const partido = actual(page);
  await expect(partido.locator('.ticket').getByText(club)).toBeVisible();
  await expect(partido.getByText('⏳ Apartada')).toBeVisible();
  await expect(partido.getByText(/Tienes hasta las/)).toBeVisible();
  // Se puede pagar entre varios (abre la hoja con la gente del partido)
  await partido.getByRole('button', { name: /Pagar entre varios/ }).click();
  await expect(page.locator('.sheet-modal.modal-in').getByRole('heading', { name: 'Dividir la cancha' })).toBeVisible();
  await page.locator('.sheet-modal.modal-in').getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.locator('.sheet-modal.modal-in')).toHaveCount(0);
  await partido.getByRole('button', { name: /Pagar la cancha/ }).click();
  const pago = page.locator('.sheet-modal.modal-in');
  await pago.getByRole('radio', { name: /Tarjeta/ }).click();
  await pago.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(pago.getByText('Pago aprobado')).toBeVisible();
  await pago.getByRole('button', { name: 'Listo' }).click();
  await expect(partido.getByText('✓ Pagada')).toBeVisible();
  await expect(partido.getByText('Reserva confirmada')).toBeVisible();
  expect(errores).toEqual([]);
});

test('el partido al que me invitaron: digo que voy y divido la cancha', async ({ page }) => {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).locator('.partido .cuerpo').first().click();
  const p = actual(page);
  await expect(p).toHaveAttribute('data-name', 'partido');
  await p.getByRole('button', { name: '🎾 Voy' }).click();
  await expect(p.getByRole('button', { name: '🎾 Voy' })).toHaveClass(/on/);
  await expect(p.getByText('3 van · faltan 1')).toBeVisible();
});

test('entrar a un torneo con mi pareja de juego', async ({ page }) => {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).locator('.torneo', { hasText: 'Open Medellín' }).click();
  const t = actual(page);
  await expect(t.getByRole('heading', { name: 'Open Medellín' })).toBeVisible();
  await t.getByRole('button', { name: /Yo voy/ }).click();
  const h = page.locator('.sheet-modal.modal-in');
  await expect(h.getByRole('radio', { name: '4ª', checked: true })).toBeVisible();
  await h.getByRole('radio', { name: 'Juan', exact: true }).click();
  await h.getByRole('button', { name: /Pagar · saldo o tarjeta/ }).click();
  await h.getByRole('button', { name: /^Pagar \$/ }).click();
  await h.getByRole('button', { name: 'Listo' }).click();
  await expect(t.getByText('✓ Inscrito')).toBeVisible();
  // Queda en la actividad de pádel
  await page.locator('.q-tabbar nav button', { hasText: 'Social' }).click();
  await actual(page).getByRole('tab', { name: /Partidos/ }).click();
  await expect(actual(page).getByText(/se inscribió en Open Medellín/).first()).toBeVisible();
});
