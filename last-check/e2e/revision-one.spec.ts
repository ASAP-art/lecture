import { expect, test, type Page } from '@playwright/test';
import { startFromTitle } from './helpers/start';

const url = '/lecture/last-check/';
const saveKey = 'last-check.saves.v1';
async function savedBytes(page: Page) {
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  return page.evaluate(key => localStorage.getItem(key), saveKey);
}
async function nextBlock(page: Page) {
  const block = page.locator('[data-block-id]');
  const before = await block.getAttribute('data-block-id');
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect.poll(async () => await block.count() ? block.getAttribute('data-block-id') : null).not.toBe(before);
}

test('start help and skippable introduction do not change saves; menu Continue preserves the existing run', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeDisabled();
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  await page.getByRole('button', { name: '플레이 방법', exact: true }).click();
  await expect(page.getByRole('heading', { name: '플레이 방법', exact: true })).toBeFocused();
  await expect(page.locator('[data-block-id], [data-choice-id], .stage-art-portrait')).toHaveCount(0);
  await page.getByRole('button', { name: '시작 메뉴로', exact: true }).click();
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  await expect(page.getByRole('button', { name: '소개 건너뛰기', exact: true })).toBeVisible();
  for (const name of ['윤서진', '박도현', '한이경', '정지후', '배수현', '오준석', '최은서']) {
    await expect(page.locator('.introduction-people').getByText(name, { exact: true })).toBeVisible();
  }
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
  await page.getByRole('button', { name: '조사 시작', exact: true }).click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_01"]')).toBeVisible();
  await nextBlock(page);
  const checkpoint = await savedBytes(page);
  await page.getByRole('button', { name: '저장/불러오기', exact: true }).click();
  await page.getByRole('button', { name: '타이틀 화면으로', exact: true }).click();
  await page.getByRole('button', { name: '진행 교체 확인', exact: true }).click();
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeEnabled();
  await expect(page.locator('[data-block-id], [data-choice-id], .stage-art-portrait')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(checkpoint);
  // Inspecting a new-game introduction is not yet a new investigation.
  await page.getByRole('button', { name: '게임 시작', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(checkpoint);
  await page.getByRole('button', { name: '시작 메뉴로', exact: true }).click();
  await page.getByRole('button', { name: '이어하기', exact: true }).click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_02"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '소개 건너뛰기', exact: true })).toHaveCount(0);
  expect(await savedBytes(page)).toBe(checkpoint);
  await page.reload();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_02"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '소개 건너뛰기', exact: true })).toHaveCount(0);
  expect(await savedBytes(page)).toBe(checkpoint);
});

test('previous dialogue never changes progress or rewards and closes the old interval when a choice is confirmed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await startFromTitle(page);
  await expect(page.getByRole('button', { name: '이전 대사', exact: true })).toBeDisabled();
  const firstText = await page.locator('.story-block .sr-only').innerText();
  await nextBlock(page);
  const beforeReview = await savedBytes(page);
  await page.getByRole('button', { name: '이전 대사', exact: true }).click();
  await expect(page.locator('[data-review-block-id="BLK_CH01_S01_01"]')).toHaveText(firstText);
  await expect(page.locator('[data-block-id], [data-choice-id]')).toHaveCount(0);
  await page.locator('.dialogue-review-note').click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(beforeReview);
  await page.getByRole('button', { name: '현재로 돌아가기', exact: true }).click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_02"]')).toBeVisible();
  let guard = 0;
  while (await page.locator('[data-block-id]').count()) {
    if (++guard > 20) throw new Error('CH01 choice boundary not reached');
    await nextBlock(page);
  }
  const beforeChoiceReview = await savedBytes(page);
  await page.getByRole('button', { name: '이전 대사', exact: true }).click();
  await expect(page.locator('[data-choice-id]')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(beforeChoiceReview);
  await page.getByRole('button', { name: '현재로 돌아가기', exact: true }).click();
  await page.locator('[data-choice-id="C01_A"]').click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_A_01"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '이전 대사', exact: true })).toBeDisabled();
  await nextBlock(page);
  const selected = await savedBytes(page);
  await page.getByRole('button', { name: '이전 대사', exact: true }).click();
  await expect(page.locator('[data-review-block-id="BLK_CH01_S01_A_01"]')).toBeVisible();
  await expect(page.locator('[data-review-block-id="BLK_CH01_S01_01"]')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(selected);
  await page.reload();
  await expect(page.locator('[data-review-block-id]')).toHaveCount(0);
  await page.getByRole('button', { name: '이전 대사', exact: true }).click();
  await expect(page.locator('[data-review-block-id="BLK_CH01_S01_A_01"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '이전 대사', exact: true })).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(selected);
});
