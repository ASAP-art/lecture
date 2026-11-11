import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import type { SaveDocument } from '../src/engine/save-schema';

const url = '/lecture/last-check/';
const saveKey = 'last-check.saves.v1';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

type Trace = { injection: string; clickedChoiceIds: string[]; observedBlocks: string[]; checkpoints: unknown[] };
const traces = new WeakMap<Page, Trace>();
const diagnostics = new WeakMap<Page, { kind: string; message: string }[]>();

test.beforeEach(async ({ page }) => {
  traces.set(page, { injection: 'none; fresh title, real touch play and application-created manual save', clickedChoiceIds: [], observedBlocks: [], checkpoints: [] });
  const messages: { kind: string; message: string }[] = [];
  diagnostics.set(page, messages);
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) messages.push({ kind: `console.${message.type()}`, message: message.text() }); });
  page.on('pageerror', error => messages.push({ kind: 'pageerror', message: error.message }));
  page.on('response', response => { if (response.status() >= 400) messages.push({ kind: 'http', message: `${response.status()} ${response.url()}` }); });
  page.on('requestfailed', request => messages.push({ kind: 'requestfailed', message: `${request.url()}: ${request.failure()?.errorText}` }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.afterEach(async ({ page }, testInfo) => {
  await testInfo.attach('mobile-actual-route.json', { body: JSON.stringify(traces.get(page), null, 2), contentType: 'application/json' });
  await testInfo.attach('mobile-browser-diagnostics.json', { body: JSON.stringify(diagnostics.get(page), null, 2), contentType: 'application/json' });
  expect(diagnostics.get(page)?.filter(item => item.kind !== 'console.warning')).toEqual([]);
});

async function saved(page: Page): Promise<SaveDocument> {
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey);
}

async function nextBlock(page: Page) {
  const block = page.locator('[data-block-id]');
  const previous = await block.getAttribute('data-block-id');
  traces.get(page)!.observedBlocks.push(previous!);
  await page.getByRole('button', { name: '계속', exact: true }).tap();
  await expect.poll(async () => await block.count() ? block.getAttribute('data-block-id') : null).not.toBe(previous);
}

async function choose(page: Page, id: string) {
  while (await page.locator('[data-block-id]').count()) await nextBlock(page);
  await page.locator(`[data-choice-id="${id}"]`).tap();
  traces.get(page)!.clickedChoiceIds.push(id);
}

async function mobileLayout(page: Page, root: Locator, testInfo: TestInfo, name: string) {
  await testInfo.attach(`${name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const box = await root.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  expect(await root.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const targets = await root.locator('button, [role="tab"], select, .save-setting').evaluateAll(elements => elements.filter(element => element.getClientRects().length > 0).map(element => {
    const rect = element.getBoundingClientRect();
    return { label: element.textContent?.trim() || element.getAttribute('aria-label'), width: rect.width, height: rect.height };
  }));
  for (const target of targets) {
    expect(target.width, `${name}: ${target.label} width`).toBeGreaterThanOrEqual(44);
    expect(target.height, `${name}: ${target.label} height`).toBeGreaterThanOrEqual(44);
  }
  traces.get(page)!.checkpoints.push({ name, targets });
}

test('WebKit mobile fresh title: touch reading settings, menu focus and persistent preferences without game injection', async ({ page }, testInfo) => {
  await expect(page.locator('img.stage-art-illustration')).toBeVisible();
  await mobileLayout(page, page.locator('.app-shell'), testInfo, 'mobile-title');
  await page.getByRole('button', { name: 'CH01 시작', exact: true }).tap();
  const initial = (await saved(page)).auto!.state;
  const settings = page.getByRole('button', { name: '읽기 설정', exact: true });
  await settings.tap();
  const menu = page.getByRole('dialog', { name: '기본 메뉴 · 저장과 불러오기', exact: true });
  await expect(menu.getByRole('heading', { name: '읽기 설정', exact: true })).toBeFocused();
  await menu.getByRole('combobox', { name: '대사 크기', exact: true }).selectOption('largest');
  await menu.getByRole('combobox', { name: '타이핑 속도', exact: true }).selectOption('slow');
  const instant = menu.getByRole('checkbox', { name: '대사 즉시 표시', exact: true });
  await instant.locator('..').tap();
  await expect(instant).toBeChecked();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('last-check.preferences.v1') ?? 'null')?.preferences.instantText)).toBe(true);
  await mobileLayout(page, menu, testInfo, 'mobile-reading-menu');
  await menu.getByRole('button', { name: '메뉴 닫기', exact: true }).tap();
  await expect(settings).toBeFocused();
  expect((await saved(page)).auto!.state).toEqual(initial);
  await page.reload();
  await expect(page.locator(`[data-block-id="${initial.blockId}"]`)).toBeVisible();
  await settings.tap();
  await expect(menu.getByRole('combobox', { name: '대사 크기', exact: true })).toHaveValue('largest');
  await expect(menu.getByRole('combobox', { name: '타이핑 속도', exact: true })).toHaveValue('slow');
  await expect(menu.getByRole('checkbox', { name: '대사 즉시 표시', exact: true })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
  expect((await saved(page)).auto!.state).toEqual(initial);
});

test('WebKit mobile fresh play: C01_A and C02_A results, separate notebook/log, manual restore and reload into CH02', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.getByRole('button', { name: 'CH01 시작', exact: true }).tap();
  await choose(page, 'C01_A');
  await expect(page.locator('[data-block-id="BLK_CH01_S01_A_01"]')).toBeVisible();
  expect((await saved(page)).auto!.state.evidence).toContain('E02');
  while (await page.locator('[data-block-id]').getAttribute('data-block-id') !== 'BLK_CH01_S02_01') await nextBlock(page);
  await expect(page.locator('[data-block-id="BLK_CH01_S02_01"]')).toBeVisible();
  const checkpoint = (await saved(page)).auto!.state;
  const notebookToggle = page.getByRole('button', { name: /^수첩 \d+$/ });
  await notebookToggle.tap();
  const notebook = page.getByRole('dialog', { name: '수첩', exact: true });
  const close = notebook.getByRole('button', { name: '닫기', exact: true });
  await expect(close).toBeFocused();
  await expect(page.getByRole('region', { name: '게임 플레이 화면', exact: true })).toHaveCount(0);
  await notebook.getByRole('tab', { name: '증거', exact: true }).tap();
  await expect(notebook.getByRole('tab', { name: '증거', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(notebook).toContainText('‘19:41 / 원본 출력 / 봉인’');
  await expect(notebook).not.toContainText(/숨은 증거|비밀 슬롯|미획득 증거 \d/);
  await mobileLayout(page, notebook, testInfo, 'mobile-notebook-evidence');
  await notebook.getByRole('tab', { name: '로그', exact: true }).tap();
  await expect(notebook.getByRole('tab', { name: '로그', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(notebook.locator('.log-list li').first()).toBeVisible();
  expect(await notebook.locator('.log-list li').count()).toBeGreaterThan(11);
  await mobileLayout(page, notebook, testInfo, 'mobile-notebook-log');
  await close.tap();
  await expect(notebookToggle).toBeFocused();
  expect((await saved(page)).auto!.state).toEqual(checkpoint);
  await notebookToggle.tap();
  await page.keyboard.press('Escape');
  await expect(notebookToggle).toBeFocused();
  const saveToggle = page.getByRole('button', { name: '저장/불러오기', exact: true });
  await saveToggle.tap();
  await page.getByRole('button', { name: '슬롯 1 저장', exact: true }).tap();
  await expect.poll(async () => (await saved(page)).manual[0]?.state.blockId).toBe(checkpoint.blockId);
  await page.getByRole('button', { name: '메뉴 닫기', exact: true }).tap();
  await expect(saveToggle).toBeFocused();
  await nextBlock(page);
  expect((await saved(page)).auto!.state.blockId).not.toBe(checkpoint.blockId);
  await saveToggle.tap();
  await page.getByRole('button', { name: '슬롯 1 불러오기', exact: true }).tap();
  await expect.poll(async () => (await saved(page)).auto!.state.blockId).toBe(checkpoint.blockId);
  const restored = (await saved(page)).auto!.state;
  expect(restored.runId).not.toBe(checkpoint.runId);
  expect(restored.parentRunId).toBe(checkpoint.runId);
  expect(restored.evidence).toEqual(checkpoint.evidence);
  expect(restored.deductions).toEqual(checkpoint.deductions);
  expect(restored.appliedEffects).toEqual(checkpoint.appliedEffects);
  await page.getByRole('button', { name: '메뉴 닫기', exact: true }).tap();
  await page.reload();
  await expect(page.locator(`[data-block-id="${checkpoint.blockId}"]`)).toBeVisible();
  expect((await saved(page)).auto!.state).toEqual(restored);
  await choose(page, 'C02_A');
  await expect(page.locator('[data-block-id="BLK_CH01_S02_A_01"]')).toBeVisible();
  while (await page.locator('[data-block-id]').getAttribute('data-block-id') !== 'BLK_CH02_S01_01') await nextBlock(page);
  await expect(page.locator('[data-block-id="BLK_CH02_S01_01"]')).toBeVisible();
  traces.get(page)!.observedBlocks.push('BLK_CH02_S01_01');
  const final = (await saved(page)).auto!.state;
  expect(final.sceneId).toBe('CH02_S01');
  expect(final.evidence).toContain('E02');
  expect(final.appliedEffects.filter(id => id === 'FX_CH01_ENTRY_E01')).toHaveLength(1);
  traces.get(page)!.checkpoints.push({ scene: final.sceneId, evidence: final.evidence, deductions: final.deductions, outcome: final.flags.FLAG_OUTCOME ?? null });
  await mobileLayout(page, page.locator('.app-shell'), testInfo, 'mobile-ch02-after-real-play');
});
