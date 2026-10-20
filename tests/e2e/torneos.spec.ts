import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Calendario y torneos de los clubes (Yo voy → comprobante o tarjeta) y la tarjeta Quilombo (modo crucero: un QR único por jugador).
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');
const hoja = (page: import('@playwright/test').Page) => page.locator('.sheet-modal.modal-in');
const COMPROBANTE = fileURLToPath(new URL('./comprobante.png', import.meta.url));

async function pagarConHoja(page: import('@playwright/test').Page) {
  await expect(hoja(page).getByRole('heading', { name: 'Pagar' })).toBeVisible();
  await hoja(page).getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pago aprobado' })).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Listo' }).click();
  await expect(hoja(page)).toHaveCount(0);
}
async function abrirCalendario(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).getByRole('button', { name: /Mi calendario/ }).click();
  await expect(actual(page).getByRole('heading', { name: 'Torneos para ti' })).toBeVisible();
}

test('el calendario muestra los torneos de La 70; Yo voy con comprobante queda en revisión', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await abrirCalendario(page);
  const c = actual(page);
  await expect(c.locator('.oferta-card', { hasText: 'Americano nocturno La 70' })).toContainText('Pádel Club La 70');
  await expect(c.locator('.oferta-card', { hasText: 'Liga La 70' })).toBeVisible();
  await c.locator('.oferta-card', { hasText: 'Americano nocturno La 70' }).getByRole('button', { name: /Yo voy/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Yo voy' })).toBeVisible();
  await hoja(page).getByRole('radio', { name: 'Juan' }).click();
  await hoja(page).getByRole('button', { name: /Adjuntar comprobante/ }).click();
  await expect(hoja(page).getByText('Nequi 300 555 7070')).toBeVisible();
  await hoja(page).locator('input[type=file]').setInputFiles(COMPROBANTE);
  await expect(hoja(page).getByRole('img', { name: 'Comprobante adjunto' })).toBeVisible();
  await hoja(page).getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(hoja(page)).toHaveCount(0);
  // Ya no es oferta: es mi torneo, en revisión
  await expect(c.locator('.oferta-card', { hasText: 'Americano nocturno La 70' })).toHaveCount(0);
  await actual(page).getByRole('button', { name: 'Volver' }).click();
  await actual(page).locator('.torneo', { hasText: 'Americano nocturno' }).click();
  await expect(actual(page).getByText('⏳ Comprobante en revisión')).toBeVisible();

  // El club lo aprueba (desde el panel; aquí se simula en la base) y se ve en vivo
  await page.evaluate(async () => {
    const db = (window as unknown as { __qDb: { social_inscripciones: { toArray(): Promise<Record<string, unknown>[]>; put(x: unknown): Promise<unknown> } } }).__qDb;
    const i = (await db.social_inscripciones.toArray()).find((x) => x.estado === 'comprobante' && x.user_id === '00000000-0000-4000-a000-000000000001');
    await db.social_inscripciones.put({ ...i, estado: 'inscrito' });
  });
  await expect(actual(page).getByText('✓ Inscrito')).toBeVisible();
  await expect(actual(page).getByText('El club aprobó tu comprobante')).toBeVisible();
  expect(errores).toEqual([]);
});

test('Yo voy pagando con tarjeta: queda inscrito de una', async ({ page }) => {
  await abrirCalendario(page);
  await actual(page).locator('.oferta-card', { hasText: 'Liga La 70' }).locator('.o-cuerpo').click();
  const t = actual(page);
  await expect(t.getByText('Grupos + eliminación directa')).toBeVisible();
  await t.getByRole('button', { name: /Yo voy/ }).click();
  await hoja(page).getByRole('button', { name: /Pagar · saldo o tarjeta/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pagar' })).toBeVisible();
  await hoja(page).getByRole('radio', { name: /Tarjeta/ }).click();
  await pagarConHoja(page);
  await expect(t.getByText('✓ Inscrito')).toBeVisible();
  await expect(t.getByText('Pagado con tarjeta')).toBeVisible();
});

test('rechazado: subo otro comprobante y vuelve a revisión', async ({ page }) => {
  await abrirCalendario(page);
  await actual(page).locator('.oferta-card', { hasText: 'Americano nocturno La 70' }).getByRole('button', { name: /Yo voy/ }).click();
  await hoja(page).getByRole('button', { name: /Adjuntar comprobante/ }).click();
  await hoja(page).locator('input[type=file]').setInputFiles(COMPROBANTE);
  await hoja(page).getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(hoja(page)).toHaveCount(0);
  await page.evaluate(async () => {
    const db = (window as unknown as { __qDb: { social_inscripciones: { toArray(): Promise<Record<string, unknown>[]>; put(x: unknown): Promise<unknown> } } }).__qDb;
    const i = (await db.social_inscripciones.toArray()).find((x) => x.estado === 'comprobante' && x.user_id === '00000000-0000-4000-a000-000000000001');
    await db.social_inscripciones.put({ ...i, estado: 'rechazada', nota_club: 'No se ve el valor' });
  });
  await actual(page).getByRole('button', { name: 'Volver' }).click();
  await actual(page).locator('.torneo', { hasText: 'Americano nocturno' }).click();
  await expect(actual(page).getByText('Rechazado: No se ve el valor')).toBeVisible();
  await actual(page).getByRole('button', { name: /Subir otro comprobante/ }).click();
  await expect(hoja(page).getByText(/rechazó el anterior/)).toBeVisible();
  await hoja(page).locator('input[type=file]').setInputFiles(COMPROBANTE);
  await hoja(page).getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(actual(page).getByText('⏳ Comprobante en revisión')).toBeVisible();
});

test('tarjeta Quilombo: mi QR único; pido con la tarjeta y se paga con mi saldo; pongo tope', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Jugar' }).click();
  await actual(page).getByRole('button', { name: /Tu tarjeta/ }).click();
  const c = actual(page);
  await expect(c.getByRole('img', { name: /QR de tu tarjeta/ })).toBeVisible();
  const codigo = (await c.locator('.codigo').textContent())!.trim();
  expect(codigo).toMatch(/^[A-Z2-9]{6}$/);
  await expect(c.getByText('Sin consumos hoy')).toBeVisible();
  await expect(c.locator('.saldo-t')).toContainText('$ 142.000');
  await c.getByRole('button', { name: /Pedir desde aquí/ }).click();
  await expect(hoja(page).getByRole('heading', { name: 'Pedir con mi tarjeta' })).toBeVisible();
  await hoja(page).getByRole('radio', { name: 'Cancha 2' }).click();
  await hoja(page).getByRole('button', { name: 'Agregar Agua' }).click();
  await hoja(page).getByRole('button', { name: 'Agregar Gatorade' }).click();
  await hoja(page).getByRole('button', { name: /Pagar con saldo 2 · \$ 11\.000/ }).click();
  await expect(hoja(page)).toHaveCount(0);
  await expect(c.getByText('Hoy en Pádel Club La 70')).toBeVisible();
  await expect(c.locator('.consumo')).toHaveText('$ 11.000');
  await expect(c.locator('.saldo-t')).toContainText('$ 131.000');
  await expect(c.locator('.pedido', { hasText: 'Cancha 2' })).toContainText('Recibido');
  await expect(c.locator('.pedido', { hasText: 'Cancha 2' })).toContainText('saldo');
  await c.getByRole('button', { name: 'Ponerle un tope a hoy' }).click();
  await c.getByRole('radio', { name: /100\.000/ }).click();
  await expect(c.getByText('Tope $ 100.000 · quedan $ 89.000')).toBeVisible();
  // La tarjeta es la misma de siempre
  await expect(c.locator('.codigo')).toHaveText(codigo);
  expect(errores).toEqual([]);
});
