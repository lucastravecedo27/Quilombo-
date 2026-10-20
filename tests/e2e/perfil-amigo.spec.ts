import { test, expect } from '@playwright/test';

// El perfil de un jugador: se abre tocando su nombre o su foto en el feed; trae su foto, su @usuario, lo de pádel
// (categoría, ranking, club, ciudad), sus publicaciones en cuadrícula y "Tú y …" con la historia de los dos.
const actual = (page: import('@playwright/test').Page) => page.locator('.view.tab-active .page-current');

test('perfil de un amigo desde el feed', async ({ page }) => {
  await page.goto('/');
  const p = actual(page);
  const post = p.locator('.tarjeta-post').filter({ hasNot: page.locator('.nombre', { hasText: /^Tú/ }) }).first();
  await expect(post).toBeVisible();
  const nombre = (await post.locator('.nombre').innerText()).split('@')[0].trim();
  await post.getByRole('button', { name: /Ver el perfil de/ }).click();
  const perfil = page.locator('.view.tab-active .page-current[data-name="persona"]');
  await expect(perfil.getByRole('heading', { name: nombre })).toBeVisible();
  await expect(perfil.getByText(/ª categoría/)).toBeVisible();
  await expect(perfil.locator('.chips').getByText(/pts/)).toBeVisible();
  await expect(perfil.getByRole('tab', { name: /Sus fotos/ })).toHaveAttribute('aria-selected', 'true');
  const celdas = perfil.locator('.grilla .celda');
  await expect(celdas.first()).toBeVisible();
  await expect(perfil.getByRole('button', { name: 'Chat' })).toBeVisible();
  await expect(perfil.getByRole('button', { name: 'Jugar' })).toBeVisible();
  await perfil.getByRole('tab', { name: /Tú y/ }).click();
  await expect(perfil.getByText('Lo que han vivido')).toBeVisible();
  await perfil.getByRole('tab', { name: /Sus fotos/ }).click();
  await celdas.first().click();
  await expect(actual(page)).toHaveAttribute('data-name', 'publicacion');
});

test('mi propia foto en el feed lleva a mi perfil', async ({ page }) => {
  await page.goto('/');
  const mio = actual(page).locator('.tarjeta-post').filter({ has: page.locator('.nombre', { hasText: /^Tú/ }) }).first();
  await mio.getByRole('button', { name: 'Ver el perfil de ti' }).click();
  await expect(actual(page)).toHaveAttribute('data-name', 'mi-perfil');
});

test('mi perfil: categoría, club y ciudad', async ({ page }) => {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Perfil' }).click();
  const p = actual(page);
  await expect(p.getByRole('radio', { name: '4ª' })).toHaveAttribute('aria-checked', 'true');
  await expect(p.getByText('1.250 pts')).toBeVisible();
  await p.getByRole('radio', { name: '3ª' }).click();
  await expect(p.getByRole('radio', { name: '3ª' })).toHaveAttribute('aria-checked', 'true');
  // Con sugerencias de ciudades (datalist) el campo es un combobox
  const ciudad = p.getByRole('combobox', { name: 'Tu ciudad' });
  await ciudad.fill('Bogotá');
  await ciudad.press('Enter');
  await expect(page.getByText('Ciudad guardada')).toBeVisible();
  await expect(ciudad).toHaveValue('Bogotá');
});
