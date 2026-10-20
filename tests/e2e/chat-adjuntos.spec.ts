import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Chat con fotos y notas de voz: se ven al instante, suben y quedan como mensaje.
const actual = (page: Page) => page.locator('.view.tab-active .page-current');
// Una imagen PNG de 2×2 (rojo) para "elegir" del carrete
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

async function abrirChat(page: Page) {
  await page.goto('/');
  await page.locator('.q-tabbar nav button', { hasText: 'Chat' }).click();
  await actual(page).locator('.q-fila', { hasText: 'Juan' }).click();
  await expect(actual(page).locator('.barra input[aria-label="Mensaje"]')).toBeVisible();
}

test('mandar una foto: polaroid en el chat y se abre en grande', async ({ page }) => {
  await abrirChat(page);
  const antes = await actual(page).locator('.polaroid').count();
  await actual(page).locator('.barra input[type="file"]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
  await expect(actual(page).locator('.polaroid')).toHaveCount(antes + 1);
  await expect(actual(page).getByText('Enviando…')).toHaveCount(0, { timeout: 8000 });
  await actual(page).locator('.polaroid').last().click();
  await expect(page.locator('.visor img')).toBeVisible();
  await page.locator('.visor .x').click();
  await expect(page.locator('.visor')).toHaveCount(0);
});

test('nota de voz: grabar, enviar y se escucha al tocar ▶︎', async ({ page }) => {
  // Micrófono y grabadora de mentira: la "grabación" es un audio real en el formato del iPhone (m4a/AAC, 2 s)
  const m4a = readFileSync(new URL('./nota-voz.m4a', import.meta.url)).toString('base64');
  await page.addInitScript((b64: string) => {
    Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { configurable: true, value: async () => new MediaStream() });
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    class Grabadora {
      static isTypeSupported(t: string) { return t === 'audio/mp4'; }
      mimeType = 'audio/mp4'; ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
      constructor(_s: MediaStream, o?: { mimeType?: string }) { if (o?.mimeType) this.mimeType = o.mimeType; }
      start() { /* graba */ }
      stop() { this.ondataavailable?.({ data: new Blob([bytes], { type: 'audio/mp4' }) }); setTimeout(() => this.onstop?.(), 10); }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, writable: true, value: Grabadora });
  }, m4a);
  await abrirChat(page);
  await actual(page).getByRole('button', { name: 'Grabar nota de voz' }).click();
  const rec = actual(page).locator('.grabando .rec');
  await expect(rec).toBeVisible();
  await expect(rec).toContainText('0:01', { timeout: 4000 });
  await actual(page).getByRole('button', { name: 'Enviar nota de voz' }).click();
  await expect(actual(page).getByText('Enviando…')).toHaveCount(0, { timeout: 8000 });
  // La burbuja "Enviando…" se cambia por la definitiva al confirmarse: esperar ese cambio antes de tocar
  await page.waitForTimeout(1800);
  const voz = actual(page).locator('.voz').last();
  await expect(voz).toBeVisible();
  await voz.scrollIntoViewIfNeeded();
  // Tocar ▶︎ y que suene de verdad: el audio avanza
  await voz.getByRole('button', { name: 'Escuchar nota de voz' }).click();
  await expect(voz.getByRole('button', { name: 'Pausar nota de voz' })).toBeVisible({ timeout: 4000 });
  await expect.poll(() => voz.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime), { timeout: 5000 }).toBeGreaterThan(0.2);
  // Al terminar (dura 2 s) vuelve a ▶︎ para escucharla otra vez
  await expect(voz.getByRole('button', { name: 'Escuchar nota de voz' })).toBeVisible({ timeout: 6000 });
  // Cancelar no manda nada
  const n = await actual(page).locator('.voz').count();
  await actual(page).getByRole('button', { name: 'Grabar nota de voz' }).click();
  await expect(rec).toBeVisible();
  await actual(page).getByRole('button', { name: 'Cancelar' }).click();
  await expect(actual(page).locator('.voz')).toHaveCount(n);
});
