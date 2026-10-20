import { test, expect } from '@playwright/test';

// Chat que fluye: el mensaje sale al instante, la caja se vacía, el teclado no se cierra y se puede seguir escribiendo.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');

test('chat: enviar es instantáneo y el campo conserva el foco', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await actual(page).getByRole('button', { name: '👥 Gente' }).click();
  // 4 conectados (pareja de juego, amigos, rival) + 1 solicitud enviada
  await expect(actual(page).locator('.persona')).toHaveCount(5);
  await actual(page).locator('.persona').first().click();
  await page.locator('.hoja-persona.modal-in').getByRole('button', { name: /Chat/ }).click();

  const campo = actual(page).getByRole('textbox', { name: 'Mensaje' });
  await campo.click();
  // Con el campo activo, los stickers y gestos se esconden para dar espacio a la conversación
  await expect(actual(page).locator('.escribir.compacta')).toBeVisible();
  for (const t of ['¿Vamos a la 70?', 'Yo llevo las pelotas', 'Confirma 🙌']) {
    await campo.fill(t);
    await campo.press('Enter');
    await expect(actual(page).locator('.burbuja.mia', { hasText: t })).toBeVisible({ timeout: 1500 });
    await expect(campo).toHaveValue('');
    await expect(campo).toBeFocused();
  }
  // Tocar Enviar tampoco cierra el teclado
  await campo.fill('Último');
  await actual(page).getByRole('button', { name: 'Enviar' }).click();
  await expect(actual(page).locator('.burbuja.mia', { hasText: 'Último' })).toBeVisible();
  await expect(campo).toBeFocused();
  // En el chat no hay barra de pestañas
  await expect(page.locator('.q-tabbar')).toHaveClass(/oculta/);
  expect(errores).toEqual([]);
});

test('chat: "son 30 mil" ofrece cobrarlo y el sticker invita a jugar', async ({ page }) => {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Chat' }).click();
  await actual(page).locator('.q-fila', { hasText: 'Juan' }).click();
  const campo = actual(page).getByRole('textbox', { name: 'Mensaje' });
  await campo.fill('La cancha son 30 mil');
  await expect(actual(page).getByRole('button', { name: /Cobrarle \$ 30\.000 a Juan/ })).toBeVisible();
  await campo.fill('');
  await campo.blur();
  await actual(page).getByRole('button', { name: '🎾 Invitar a jugar' }).click();
  await expect(page.locator('.sheet-modal.modal-in').getByRole('heading', { name: 'Invitar a jugar' })).toBeVisible();
  await expect(page.locator('.sheet-modal.modal-in').getByRole('button', { name: 'Juan', pressed: true })).toBeVisible();
});
