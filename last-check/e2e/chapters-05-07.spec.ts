import { expect, test, type Page } from '@playwright/test';

async function nextBlock(page: Page) {
  const block = page.locator('[data-block-id]');
  const previous = await block.getAttribute('data-block-id');
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect.poll(async () => await block.count() ? block.getAttribute('data-block-id') : null).not.toBe(previous);
}
async function saved(page: Page) {
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  return page.evaluate(() => JSON.parse(localStorage.getItem('last-check.saves.v1')!).auto.state);
}
async function chooseAfterDialogue(page: Page, choiceId: string) {
  while (await page.locator('[data-block-id]').count()) await nextBlock(page);
  await page.locator(`[data-choice-id="${choiceId}"]`).click();
}

test('plays through CH07 with missing analysis, staged private disclosure, and no automatic recovery', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lecture/last-check/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'CH01 시작', exact: true }).click();
  const route = ['C01_B', 'C02_A', 'C03_B', 'C04_B', 'C05_B', 'C06_C', 'C07_A', 'C08_A', 'C09_B', 'C10_A', 'C11_A', 'C12_B', 'C13_A', 'C14_B', 'C15_C', 'C16_A', 'C17_A'];
  for (const choiceId of route) {
    while (await page.locator('[data-block-id]').count()) await nextBlock(page);
    if (choiceId === 'C12_B') await expect(page.locator('[data-pinned-block]')).toHaveCount(2);
    if (choiceId === 'C16_A') {
      await expect(page.locator('[data-confirmed="false"]')).toHaveCount(3);
      await expect(page.locator('[data-confirmed="true"]')).toHaveCount(0);
    }
    if (choiceId === 'C17_A') await expect(page.getByText('화면 항목: 정의 미확인')).toBeVisible();
    await page.locator(`[data-choice-id="${choiceId}"]`).click();
    if (choiceId === 'C11_A') {
      await page.getByRole('button', { name: /수첩/ }).click();
      await expect.poll(async () => (await saved(page)).evidence).toContain('E12');
      await expect.poll(async () => (await saved(page)).evidence).toContain('E15');
      await expect(page.locator('.notebook').getByText('이미 은서가 보관한 친모 관련 원본 일부', { exact: true })).toHaveCount(0);
      await expect(page.locator('.notebook').getByText('25년 전 위조 서류와 친모의 미동의 기록', { exact: true })).toHaveCount(0);
      const before = await page.locator('[data-block-id]').getAttribute('data-block-id');
      await page.reload();
      await expect(page.locator(`[data-block-id="${before}"]`)).toBeVisible();
      await page.getByRole('button', { name: /수첩/ }).click();
      await nextBlock(page);
      await expect(page.locator('.notebook').getByRole('heading', { name: '이미 은서가 보관한 친모 관련 원본 일부', exact: true })).toBeVisible();
      await expect(page.locator('.notebook').getByText('25년 전 위조 서류와 친모의 미동의 기록', { exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: /수첩/ }).click();
    }
    if (choiceId === 'C16_A') {
      await expect(page.locator('.story-block')).toContainText('지금은 후보 시간표예요.');
      expect((await saved(page)).deductions).not.toContain('D2');
    }
  }
  while (await page.locator('[data-block-id]').count()) await nextBlock(page);
  await expect(page.getByLabel('재확인 통화')).toHaveText('미청취');
  const final = await saved(page);
  expect(final.sceneId).toBe('CH08_S01');
  expect(final.blockedNextSceneId).toBeNull();
  expect(final.evidence).not.toContain('E04');
  expect(final.evidence).not.toContain('E07');
  expect(final.evidence).not.toContain('E10');
  expect(final.deductions).toEqual([]);
});

test('shows unavailable consent choice and distinguishes confirmed from candidate timelines', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lecture/last-check/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'CH01 시작', exact: true }).click();
  for (const choiceId of ['C01_B', 'C02_A', 'C03_A', 'C04_B', 'C05_A', 'C06_B', 'C07_B', 'C08_A', 'C09_B', 'C10_C']) {
    await chooseAfterDialogue(page, choiceId);
  }
  while (await page.locator('[data-block-id]').count()) await nextBlock(page);
  await expect(page.locator('[data-choice-id="C11_A"]')).toBeDisabled();
  await expect(page.getByText('당사자 동의 미확보')).toBeVisible();
  await expect(page.locator('[data-choice-id="C11_B"]')).toBeEnabled();
  for (const choiceId of ['C11_B', 'C12_A', 'C13_A', 'C14_A', 'C15_A']) {
    await chooseAfterDialogue(page, choiceId);
  }
  while (await page.locator('[data-block-id]').count()) await nextBlock(page);
  await expect(page.locator('[data-confirmed="true"]')).toHaveCount(3);
  await expect(page.locator('[data-confirmed="false"]')).toHaveCount(0);
  await page.locator('[data-choice-id="C16_A"]').click();
  await expect(page.locator('.story-block')).toContainText('7시 40분 이동이 먼저다.');
  await expect.poll(async () => (await saved(page)).deductions).toContain('D2');
});
