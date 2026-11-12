import type { Page } from '@playwright/test';

export async function startFromTitle(page: Page, input: 'click' | 'tap' = 'click') {
  await page.getByRole('button', { name: '게임 시작', exact: true })[input]();
  await page.getByRole('button', { name: '소개 건너뛰기', exact: true })[input]();
  await page.locator('[data-block-id]').waitFor({ state: 'visible' });
}
