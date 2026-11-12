import { expect, test, type Page } from '@playwright/test';
import { startFromTitle } from './helpers/start';

async function finishAndContinue(page: Page) {
  const block = page.locator('[data-block-id]');
  const previousBlockId = await block.getAttribute('data-block-id');
  await page.getByRole('button', { name: '계속' }).click();
  await expect
    .poll(async () =>
      (await block.count()) === 0 ? null : block.getAttribute('data-block-id'),
    )
    .not.toBe(previousBlockId);
}

test('plays CH01 choice result, hides notebook secrets, and restores the same block', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lecture/last-check/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();


  await startFromTitle(page);
  await expect(page.locator('[data-block-id="BLK_CH01_S01_01"]')).toBeVisible();

  for (let index = 0; index < 11; index += 1) await finishAndContinue(page);
  await expect(page.getByRole('heading', { name: '선택:' })).toBeVisible();
  await expect(page.getByRole('button', { name: /봉투의 봉인·시각·인계자/ })).toBeVisible();

  await page.getByRole('button', { name: /수첩/ }).click();
  await expect(page.getByText('기계실 외함에 금속이 쓸린 흔적이 보였다.')).toBeVisible();
  await expect(page.getByText('‘19:41 / 원본 출력 / 봉인’')).toHaveCount(0);

  await page.getByRole('button', { name: /봉투의 봉인·시각·인계자/ }).click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_A_01"]')).toBeVisible();

  await expect
    .poll(async () => {
      const saved = await page.evaluate(() =>
        JSON.parse(window.localStorage.getItem('last-check.saves.v1') ?? 'null')?.auto?.state,
      );
      return saved?.evidence ?? [];
    })
    .toContain('E02');

  const savedBeforeDisclosure = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('last-check.saves.v1') ?? 'null')?.auto?.state,
  );
  expect(savedBeforeDisclosure.evidence).toContain('E02');
  expect(savedBeforeDisclosure.revealedEvidenceSections).not.toContain('ESECTION_E02_ENVELOPE');

  for (let index = 0; index < 5; index += 1) await finishAndContinue(page);
  await expect(page.locator('[data-block-id="BLK_CH01_S02_01"]')).toBeVisible();
  await expect(page.getByText('‘19:41 / 원본 출력 / 봉인’')).toBeVisible();

  const blockBeforeReload = await page.locator('[data-block-id]').getAttribute('data-block-id');
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  await page.reload();
  await expect(page.locator(`[data-block-id="${blockBeforeReload}"]`)).toBeVisible();
  await expect(page.getByText('전체 게임, 미술, 사람 플레이테스트, 배포 완료 상태가 아닙니다.')).toHaveCount(0);
  await expect(page.getByText(/사람 플레이테스트\/배포: 미완료/)).toBeVisible();

  for (let index = 0; index < 12; index += 1) await finishAndContinue(page);
  await page.getByRole('button', { name: /열쇠 사용 사실과 살인을 구분/ }).click();
  for (let index = 0; index < 5; index += 1) await finishAndContinue(page);

  await expect(page.locator('[data-block-id="BLK_CH02_S01_01"]')).toBeVisible();
  await expect(page.getByText('CHAPTER 02 이후는 아직 구현되지 않았습니다.')).toHaveCount(0);
  await page.getByRole('button', { name: /수첩/ }).click();
  await expect(page.getByRole('heading', { name: '진술은 수첩에 보존.' })).toBeVisible();
  await expect(page.getByText('이경: “7시 37분쯤. 점검 서명을 하려고요.”')).toBeVisible();
});

test('completes typing on first input, advances on second, enforces modal/menu guards, focus return, and notebook tab immutability', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/lecture/last-check/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  // Non-existent save -> Continue is disabled on title screen and in menu
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeDisabled();

  await startFromTitle(page);
  await expect(page.locator('[data-block-id="BLK_CH01_S01_01"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '현재 문장 모두 표시', exact: true })).toBeVisible();

  // First input completes typing without advancing block
  await page.getByRole('button', { name: '현재 문장 모두 표시', exact: true }).click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_01"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '계속', exact: true })).toBeVisible();

  // Second input advances to next block
  await page.getByRole('button', { name: '계속', exact: true }).click();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_02"]')).toBeVisible();

  // Open menu: modal blocks progression and returns focus on Escape
  const menuToggle = page.getByRole('button', { name: '저장/불러오기', exact: true });
  await menuToggle.click();
  await expect(page.getByRole('dialog', { name: /기본 메뉴/ })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-block-id="BLK_CH01_S01_02"]')).toBeVisible();

  // Replacement confirmation dialog & cancel focus return
  const newGameBtn = page.getByRole('button', { name: '새 게임 시작', exact: true });
  await newGameBtn.click();
  await expect(page.getByRole('alertdialog', { name: '진행 교체 확인' })).toBeVisible();
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: '진행 교체 확인' })).toHaveCount(0);
  await expect(newGameBtn).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /기본 메뉴/ })).toHaveCount(0);
  await expect(menuToggle).toBeFocused();

  // Inspect all notebook tabs and verify state immutability & no developer/internal leakage
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  const stateBeforeNotebook = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('last-check.saves.v1')!).auto.state,
  );

  const notebookToggle = page.getByRole('button', { name: /^수첩 \d+$/ });
  await notebookToggle.click();
  const notebook = page.locator('#investigation-notebook');
  await expect(notebook).toBeVisible();

  for (const tabName of ['증거', '진술', '인물', '시간표', '명단', '가설판', '로그', '전체 기록']) {
    await notebook.getByRole('tab', { name: tabName, exact: true }).click();
    const textContent = await notebook.innerText();
    expect(textContent).not.toMatch(/현재값과 과거값 구분|독립 원본이 있음을 알림|수동 살인설 반박|proof|full|insight|CHAR_|ESECTION_|NOTE_|BLK_|숨은 증거/);
    if (tabName === '로그') {
      expect(textContent).toContain('지하로 내려가자 젖은 종이 냄새가 났다.');
      expect(textContent).not.toContain('신고는 7시 41분');
    }
  }

  await notebook.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(notebook).toHaveCount(0);
  await expect(notebookToggle).toBeFocused();

  const stateAfterNotebook = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('last-check.saves.v1')!).auto.state,
  );
  expect(stateAfterNotebook).toEqual(stateBeforeNotebook);

  // Returning to the start menu preserves the current run; Continue resumes without an intro.
  await menuToggle.click();
  await page.getByRole('button', { name: '타이틀 화면으로', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: '진행 교체 확인' })).toBeVisible();
  await page.getByRole('button', { name: '진행 교체 확인', exact: true }).click();
  await expect(page.getByRole('button', { name: '게임 시작', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('last-check.saves.v1')!).auto.state)).toEqual(stateAfterNotebook);
  await page.getByRole('button', { name: '이어하기', exact: true }).click();
  await expect(page.locator('[data-block-id]')).toBeVisible();
  await expect(page.getByRole('heading', { name: '조사를 시작하기 전에', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('last-check.saves.v1')!).auto.state)).toEqual(stateAfterNotebook);

  // Incompatible save also keeps Continue disabled
  await page.evaluate(() => window.localStorage.setItem('last-check.saves.v1', '{"version":99}'));
  await page.reload();
  await expect(page.getByRole('button', { name: '이어하기', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '저장/불러오기', exact: true }).click();
  await expect(page.locator('#save-panel').getByRole('button', { name: '이어하기', exact: true })).toBeDisabled();
});
