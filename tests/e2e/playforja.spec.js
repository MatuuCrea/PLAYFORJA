import { test, expect } from '@playwright/test';

test('la portada carga datos de prueba reales desde Supabase sin inventar actividad', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.auth-open')).toBeVisible();
  await expect.poll(async () => page.locator('#torneos .game-card .pill').first().innerText(), { timeout: 30000 }).toContain('MUESTRA');
  await expect(page.locator('#torneos .game-card')).toHaveCount(3);
  await expect(page.locator('#salas .room-card').filter({ hasText: 'Duelo Infernal' }).locator('.status')).toContainText('MUESTRA');
  await expect(page.locator('#salas .room-card').filter({ hasText: 'Torneo Nocturno' }).locator('.status')).toContainText('MUESTRA');
  await expect(page.locator('#marcos .frame-card').first().locator('b')).toContainText('PF');
  await expect(page.locator('#streaming')).toContainText('PRÓXIMAMENTE');
  await expect(page.locator('#streaming')).toContainText('todavía no conectado');
});

test('los filtros de plataforma cambian los torneos visibles', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => page.locator('#torneos .game-card').first().getAttribute('data-platform'), { timeout: 30000 }).not.toBeNull();
  await page.locator('[data-platform-filter="PC"]').click();
  await expect(page.locator('#torneos .game-card').filter({ hasText: 'Valorant' })).toBeVisible();
  await expect(page.locator('#torneos .game-card').filter({ hasText: 'Mobile Legends' })).toBeHidden();
  await page.locator('[data-platform-filter="Móvil"]').click();
  await expect(page.locator('#torneos .game-card').filter({ hasText: 'Mobile Legends' })).toBeVisible();
  await expect(page.locator('#torneos .game-card').filter({ hasText: 'Free Fire' })).toBeVisible();
});

test('el globo gira y permite elegir una ciudad y coordenadas', async ({ page }) => {
  await page.goto('/');
  const globe = page.locator('#playforja-globe');
  await expect(globe).toBeVisible();
  await page.locator('[data-city="Buenos Aires"]').click();
  await expect(page.locator('#globe-place')).toHaveText('Buenos Aires');
  await expect(page.locator('#globe-coordinates')).toContainText('-34.6037');
  await page.locator('#globe-search').fill('-31.4167,-64.1833');
  await page.locator('#globe-search-go').click();
  await expect(page.locator('#globe-place')).toHaveText('Coordenadas elegidas');
  await expect(page.locator('#globe-coordinates')).toContainText('-31.4167');
});

test('el acceso abre un formulario real y explica que requiere cuenta', async ({ page }) => {
  await page.goto('/');
  await page.locator('.auth-open').click();
  await expect(page.locator('.auth-modal')).toBeVisible();
  await expect(page.locator('.auth-modal input[name="email"]')).toBeVisible();
  await expect(page.locator('.auth-modal input[name="password"]')).toBeVisible();
});

test('inicio de sesión con cuenta de prueba cuando existen credenciales protegidas', async ({ page }) => {
  const email = process.env.PLAYFORJA_E2E_EMAIL;
  const password = process.env.PLAYFORJA_E2E_PASSWORD;
  test.skip(!email || !password, 'No se configuró una cuenta E2E dedicada en los secretos de GitHub.');
  await page.goto('/');
  await page.locator('.auth-open').click();
  await page.locator('.auth-modal input[name="email"]').fill(email);
  await page.locator('.auth-modal input[name="password"]').fill(password);
  await page.locator('.auth-modal form [type="submit"]').click();
  await expect.poll(() => page.evaluate(() => window.PLAYFORJA?.getUser()?.email), { timeout: 30000 }).toBe(email);
});
