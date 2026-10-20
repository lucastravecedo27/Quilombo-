import { test, expect } from '@playwright/test';

// El jugador y el club: reservar solo (apartar → pagar), pedir del bar a la cancha y pagar en la app.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');
const hoja = (page: import('@playwright/test').Page) => page.locator('.sheet-modal.modal-in');

async function pagarConHoja(page: import('@playwright/test').Page) {
  await expect(hoja(page).getByRole('heading', { name: 'Pagar' })).toBeVisible();
  await hoja(page).getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pago aprobado' })).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Listo' }).click();
  await expect(hoja(page)).toHaveCount(0);
}

test('reservar solo: queda apartada, la pago y queda pagada en mis reservas', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  const p = actual(page);
  await expect(p.getByText('No tienes canchas reservadas')).toBeVisible();
  await p.getByRole('tab', { name: 'Mañana' }).click();
  await p.locator('.franja', { hasText: 'La 70' }).first().click();
  await expect(hoja(page).getByRole('heading', { name: 'Reservar cancha' })).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Apartar (pagas después)' }).click();

  const r = actual(page);
  await expect(r).toHaveAttribute('data-name', 'partido');
  await expect(r.getByText('⏳ Apartada')).toBeVisible();
  await expect(r.getByText('Solo tú por ahora · faltan 3')).toBeVisible();
  await expect(r.locator('.codigo b')).toHaveText(/^[A-Z2-9]{6}$/);
  await r.getByRole('button', { name: /Pagar la cancha/ }).click();
  await pagarConHoja(page);
  await expect(r.getByText('✓ Pagada')).toBeVisible();

  // En Jugar aparece en "Tus reservas" como pagada
  await actual(page).locator('.q-volver').click();
  await expect(actual(page)).toHaveAttribute('data-name', 'jugar');
  await expect(actual(page).locator('.reserva', { hasText: 'Pádel Club La 70' })).toContainText('✓ Pagada');
  expect(errores).toEqual([]);
});

test('reservar y pagar de una', async ({ page }) => {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).getByRole('tab', { name: 'Mañana' }).click();
  await actual(page).locator('.franja', { hasText: 'La 70' }).first().click();
  await hoja(page).getByRole('button', { name: /Reservar y pagar/ }).click();
  await pagarConHoja(page);
  await expect(actual(page).getByText('✓ Pagada')).toBeVisible();
  await expect(actual(page).getByText('Reserva confirmada')).toBeVisible();
});

test('el partido de Juan: voy, pido a la cancha y pago el pedido en la app', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).locator('.partido .cuerpo').first().click();
  const p = actual(page);
  await expect(p).toHaveAttribute('data-name', 'partido');
  await p.getByRole('button', { name: '🎾 Voy' }).click();
  await expect(p.getByText('⏳ Apartada')).toBeVisible();

  await p.getByRole('button', { name: /Pedir a la cancha/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pedir a la cancha' })).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Agregar Gatorade' }).click();
  await hoja(page).getByRole('button', { name: 'Agregar Gatorade' }).click();
  await hoja(page).getByRole('tab', { name: /Comida/ }).click();
  await hoja(page).getByRole('button', { name: 'Agregar Empanadas ×3' }).click();
  await hoja(page).getByRole('button', { name: 'Pedir 3 · $ 23.000' }).click();

  const pedido = p.locator('.pedido').first();
  await expect(pedido).toContainText('2× Gatorade, 1× Empanadas ×3');
  await expect(pedido.locator('.p-estado')).toHaveText('Recibido');
  await pedido.getByRole('button', { name: 'Pagar', exact: true }).click();
  await pagarConHoja(page);
  await expect(pedido.locator('.p-estado')).toHaveText('Pagado ✓');

  // Y la cancha también se paga con la hoja de pago
  await p.getByRole('button', { name: /Pagar la cancha/ }).click();
  await pagarConHoja(page);
  await expect(p.getByText('✓ Pagada')).toBeVisible();
  expect(errores).toEqual([]);
});

test('torneo con precio: Yo voy y pago la inscripción con tarjeta en la app', async ({ page }) => {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).locator('.torneo', { hasText: 'Open Medellín' }).click();
  const t = actual(page);
  await t.getByRole('button', { name: /Yo voy · \$ 180\.000/ }).click();
  await hoja(page).getByRole('button', { name: /Pagar · saldo o tarjeta · \$ 180\.000/ }).click();
  // Con el saldo no alcanza (tiene $ 142.000): se elige tarjeta
  await expect(hoja(page).getByText(/te faltan \$ 38\.000/i)).toBeVisible();
  await hoja(page).getByRole('radio', { name: /Tarjeta/ }).click();
  await pagarConHoja(page);
  await expect(t.getByText('✓ Inscrito')).toBeVisible();
  await expect(t.getByText('Pagado con tarjeta. ¡A entrenar!')).toBeVisible();
});
