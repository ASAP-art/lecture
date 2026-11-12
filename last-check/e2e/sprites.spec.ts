/// <reference lib="es2024.promise" />
// The resolver gate runs in Node, not in the ES2022 browser bundle.
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { startFromTitle } from './helpers/start';

const url = '/lecture/last-check/';
const saveKey = 'last-check.saves.v1';
const pose = (page: Page, id: string) => page.locator(`.stage-art-portrait[data-art-asset="${id}"]`);
async function saved(page: Page) {
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  return page.evaluate(key => localStorage.getItem(key)!, saveKey);
}
async function next(page: Page) {
  const before = await page.locator('[data-block-id]').getAttribute('data-block-id');
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect.poll(async () => await page.locator('[data-block-id]').count()
    ? page.locator('[data-block-id]').getAttribute('data-block-id') : null).not.toBe(before);
}
async function walkTo(page: Page, blockId: string) {
  for (let step = 0; step < 60; step += 1) {
    if (await page.locator(`[data-block-id="${blockId}"]`).count()) return;
    const choice = page.locator('[data-choice-id="C01_B"], [data-choice-id="C08_A"]');
    if (await choice.count()) await choice.click();
    else await next(page);
  }
  throw new Error(`UI did not reach ${blockId}`);
}
async function boundaryFixture(page: Page, blockId: string) {
  const raw = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tests/helpers/sprite-browser-fixture.ts', blockId], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  await page.goto(url);
  await expect(page.locator('.stage-art-illustration')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: raw });
  await page.reload();
  await expect(page.locator(`[data-block-id="${blockId}"]`)).toBeVisible();
}

test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

test('real UI choices switch current actions, return to neutral and recompute portraits after slot load and reconnect', async ({ page }) => {
  await page.goto(url);
  await startFromTitle(page);
  await walkTo(page, 'BLK_CH01_S02_05');
  await expect(pose(page, 'char_yikyung_neutral')).toBeVisible();
  await next(page);
  await expect(pose(page, 'char_yikyung_looking_at_key')).toBeVisible();
  await expect(pose(page, 'char_yikyung_neutral')).toBeHidden();
  await next(page);
  await expect(pose(page, 'char_yikyung_neutral')).toBeVisible();
  await expect(pose(page, 'char_yikyung_looking_at_key')).toHaveCount(0);
  await next(page);
  await expect(pose(page, 'char_dohyun_sliding_casefile')).toBeVisible();
  await expect(page.locator('.stage-art-portrait-slot')).toHaveCount(2);
  const before = JSON.parse(await saved(page)).auto.state;
  await page.getByRole('button', { name: '저장/불러오기', exact: true }).click();
  await page.getByRole('button', { name: '슬롯 1 저장', exact: true }).click();
  await saved(page);
  await page.getByRole('button', { name: '메뉴 닫기', exact: true }).click();
  await next(page);
  await expect(page.locator('.stage-art-portrait-slot')).toHaveCount(0);
  await page.getByRole('button', { name: '저장/불러오기', exact: true }).click();
  await page.getByRole('button', { name: '슬롯 1 불러오기', exact: true }).click();
  await page.getByRole('button', { name: '메뉴 닫기', exact: true }).click();
  await expect(pose(page, 'char_dohyun_sliding_casefile')).toBeVisible();
  const restored = JSON.parse(await saved(page)).auto.state;
  for (const key of ['blockId', 'choiceHistory', 'evidence', 'deductions', 'appliedEffects']) expect(restored[key]).toEqual(before[key]);
  const bytes = await saved(page);
  await page.reload();
  await expect(pose(page, 'char_dohyun_sliding_casefile')).toBeVisible();
  expect(await saved(page)).toBe(bytes);
});

test('boundary injection: a failed current pose keeps the neutral character and save intact, and loads normally after recovery', async ({ page }) => {
  const pattern = '**/char_yikyung_reaching_paper.png?*';
  await page.route(pattern, route => route.abort('failed'));
  await boundaryFixture(page, 'BLK_CH04_S01_07');
  await next(page);
  await expect(page.locator('[data-character="char_yikyung_neutral"]')).toHaveAttribute('data-pose-state', 'failed');
  await expect(pose(page, 'char_yikyung_neutral')).toBeVisible();
  await expect(pose(page, 'char_yikyung_reaching_paper')).toHaveCount(0);
  const bytes = await saved(page);
  await page.reload();
  await expect(page.locator('[data-character="char_yikyung_neutral"]')).toHaveAttribute('data-pose-state', 'failed');
  await expect(pose(page, 'char_yikyung_neutral')).toBeVisible();
  expect(await saved(page)).toBe(bytes);
  await page.unroute(pattern);
  await page.reload();
  await expect(pose(page, 'char_yikyung_reaching_paper')).toBeVisible();
  expect(await saved(page)).toBe(bytes);
});

test('boundary injection: a late old-scene image cannot replace the new action or write game state', async ({ page }) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  let requested = false;
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    Reflect.set(window, 'decodedSpriteUrls', []);
    HTMLImageElement.prototype.decode = function () {
      const source = this.src;
      return decode.call(this).finally(() => { Reflect.get(window, 'decodedSpriteUrls').push(source); });
    };
  });
  await page.route('**/char_yikyung_reaching_paper.png?*', async route => {
    requested = true;
    await gate;
    await route.fulfill({ path: resolve('public/assets/char_yikyung_reaching_paper.png'), contentType: 'image/png' });
  });
  try {
    await boundaryFixture(page, 'BLK_CH04_S01_07');
    await next(page);
    await expect.poll(() => requested).toBe(true);
    await expect(pose(page, 'char_yikyung_neutral')).toBeVisible();
    await expect(page.locator('[data-character="char_yikyung_neutral"]')).toHaveAttribute('data-pose-state', 'loading');
    await walkTo(page, 'BLK_CH04_S02_02');
    await expect(pose(page, 'char_yikyung_confession')).toBeVisible();
    const bytes = await saved(page);
    release();
    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'decodedSpriteUrls').some((value: string) => value.includes('char_yikyung_reaching_paper.png')))).toBe(true);
    await expect(pose(page, 'char_yikyung_confession')).toBeVisible();
    await expect(pose(page, 'char_yikyung_reaching_paper')).toHaveCount(0);
    expect(await saved(page)).toBe(bytes);
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
});
