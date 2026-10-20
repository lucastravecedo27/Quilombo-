import { test, expect } from '@playwright/test';

// Saldo Quilombo: recargar y pagar todo con saldo; pagar entre varios (mitad y mitad), cada uno su parte con su saldo.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');
const hoja = (page: import('@playwright/test').Page) => page.locator('.sheet-modal.modal-in');

async function irAJugar(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await expect(actual(page).locator('.saldo-chip')).toContainText('$ 142.000');
}

test('recargo $ 200.000 por PSE y el saldo sube', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await irAJugar(page);
  await actual(page).getByRole('button', { name: /Recargar saldo/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Recargar saldo' })).toBeVisible();
  await hoja(page).getByRole('radio', { name: '$ 200.000' }).click();
  await hoja(page).getByRole('combobox', { name: 'Banco' }).selectOption('Davivienda');
  await hoja(page).getByRole('button', { name: 'Recargar $ 200.000' }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Saldo recargado' })).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Listo' }).click();
  await expect(actual(page).locator('.saldo-chip')).toContainText('$ 342.000');
  // En la billetera queda el movimiento
  await actual(page).locator('.saldo-chip').click();
  await expect(actual(page)).toHaveAttribute('data-name', 'saldo');
  await expect(actual(page).locator('.mov').first()).toContainText('Recarga con PSE');
  await expect(actual(page).locator('.mov').first()).toContainText('+ $ 200.000');
  expect(errores).toEqual([]);
});

test('reservo y pago la cancha con mi saldo', async ({ page }) => {
  await irAJugar(page);
  const p = actual(page);
  await p.getByRole('tab', { name: 'Mañana' }).click();
  await p.locator('.franja', { hasText: 'La 70' }).first().click();
  await hoja(page).getByRole('button', { name: /Reservar y pagar/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pagar' })).toBeVisible();
  await expect(hoja(page).getByRole('radio', { name: /Saldo Quilombo/ })).toHaveAttribute('aria-checked', 'true');
  await hoja(page).getByRole('button', { name: /^Pagar \$ 120\.000 con saldo/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pago aprobado' })).toBeVisible();
  await expect(hoja(page).getByText(/te quedan \$ 22\.000/)).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Listo' }).click();
  await expect(actual(page).getByText('✓ Pagada')).toBeVisible();
});

test('la cancha de Juan, mitad y mitad: pago mi parte y Juan la suya, queda pagada', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await irAJugar(page);
  await actual(page).locator('.partido .cuerpo').first().click();
  const p = actual(page);
  await expect(p).toHaveAttribute('data-name', 'partido');
  await p.getByRole('button', { name: '🎾 Voy' }).click();
  await p.getByRole('button', { name: /Pagar entre varios/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Dividir la cancha' })).toBeVisible();
  // Van Juan, Caro y yo: elijo mitad y mitad con Juan
  await hoja(page).getByRole('radio', { name: /Mitad y mitad/ }).click();
  await hoja(page).getByRole('button', { name: 'Juan', exact: true }).click();
  await expect(hoja(page).locator('.parte')).toHaveCount(2);
  await hoja(page).getByRole('button', { name: /pagar mi parte · \$ 80\.000/ }).click();
  await expect(hoja(page)).toHaveCount(0);
  // Mientras Juan paga, la cancha va a medias
  await expect(p.locator('.div')).toContainText('$ 80.000 de $ 160.000');
  // Juan (bot de la demo) paga su parte con su saldo y la cancha queda pagada
  await expect(p.locator('.div')).toContainText('✓ Pagado entre 2', { timeout: 12_000 });
  await expect(p.getByText('✓ Pagada').first()).toBeVisible();
  // Mi saldo bajó solo mi parte
  await page.locator('.q-tabbar nav button', { hasText: 'Perfil' }).click();
  await expect(actual(page).locator('.saldo-p')).toContainText('$ 62.000');
  expect(errores).toEqual([]);
});
