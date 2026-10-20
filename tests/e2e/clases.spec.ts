import { test, expect } from '@playwright/test';

// Clases con profe: el jugador elige profe, reserva un horario y paga con saldo (la cancha queda a nombre de la
// clase); el profe (la demo usada como profe) ve su agenda y abre un horario nuevo.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');
const hoja = (page: import('@playwright/test').Page) => page.locator('.sheet-modal.modal-in');
const MONICA = '00000000-0000-4000-b300-000000000002';

test('elijo a Mónica, reservo una clase con saldo y queda en Tus clases', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).locator('.clases-cta').click();
  await expect(actual(page)).toHaveAttribute('data-name', 'clases');
  await expect(actual(page).locator('.profe', { hasText: 'Mónica Arias' })).toBeVisible();
  // Filtro de nivel: iniciación deja a Diego y saca a Mónica
  await actual(page).getByRole('tab', { name: 'Iniciación' }).click();
  await expect(actual(page).locator('.profe', { hasText: 'Diego Salazar' })).toBeVisible();
  await expect(actual(page).locator('.profe', { hasText: 'Mónica Arias' })).toHaveCount(0);
  await actual(page).getByRole('tab', { name: 'Todo nivel' }).click();

  await actual(page).locator('.profe', { hasText: 'Mónica Arias' }).click();
  await expect(actual(page)).toHaveAttribute('data-name', 'profesor');
  await expect(actual(page).getByRole('heading', { name: 'Mónica Arias' })).toBeVisible();
  await expect(actual(page).getByText('Te cambia la forma de leer el partido.')).toBeVisible();
  // Un horario grupal (alcanza con el saldo de la demo)
  await actual(page).locator('.horario.libre', { hasText: 'Grupal' }).first().click();
  await expect(hoja(page).getByRole('heading', { name: 'Reservar clase' })).toBeVisible();
  await hoja(page).getByRole('button', { name: /Reservar y pagar/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pagar' })).toBeVisible();
  await hoja(page).getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pago aprobado' })).toBeVisible();
  await expect(hoja(page).getByText(/Clase reservada con Mónica/)).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Listo' }).click();
  await expect(actual(page).locator('.horario.mia').first()).toContainText('✓ Reservada');

  // En Jugar: Tus clases, y el saldo bajó
  await actual(page).getByRole('button', { name: 'Volver' }).click();
  await actual(page).getByRole('button', { name: 'Volver' }).click();
  await expect(actual(page).locator('.mia', { hasText: 'Clase con Mónica' })).toBeVisible();
  await expect(actual(page).locator('.saldo-chip')).not.toContainText('$ 142.000');
  // Cancelar devuelve el saldo
  await actual(page).locator('.mia', { hasText: 'Clase con Mónica' }).getByRole('button', { name: 'Cancelar' }).click();
  await page.locator('.dialog .dialog-button', { hasText: 'Aceptar' }).click();
  await expect(actual(page).locator('.mia', { hasText: 'Clase con Mónica' })).toHaveCount(0);
  await expect(actual(page).locator('.saldo-chip')).toContainText('$ 142.000');
  expect(errores).toEqual([]);
});

test('como profe veo mi agenda y abro un horario nuevo', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript((u) => localStorage.setItem('q-demo-uid', u), MONICA);
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Perfil' }).click();
  const modo = actual(page).locator('.modo');
  await expect(modo).toContainText('Modo profesor');
  await expect(modo).toContainText('Táctica y competencia');
  const antes = await actual(page).locator('.agenda .clase').count();
  expect(antes).toBeGreaterThan(0);
  // La clase grupal de hoy ya tiene a Caro
  await expect(actual(page).locator('.agenda .clase .alumnos em', { hasText: 'Caro López' })).toBeVisible();

  await modo.getByRole('button', { name: '＋ Abrir horario' }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Abrir horario de clase' })).toBeVisible();
  await hoja(page).locator('.chips button', { hasText: 'Pádel Club La 70' }).click();
  await hoja(page).locator('.chips button', { hasText: 'Mañana' }).click();
  await hoja(page).locator('.franjas button').first().click();
  await hoja(page).getByRole('radio', { name: '👥 Grupal' }).click();
  await hoja(page).getByRole('button', { name: /Abrir horario · \$ 65\.000/ }).click();
  await expect(page.locator('.q-aviso, [role="status"]').filter({ hasText: 'Horario abierto' }).first()).toBeVisible();
  await expect(actual(page).locator('.agenda .clase')).toHaveCount(antes + 1);
  expect(errores).toEqual([]);
});
