import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import type { SaveDocument } from '../src/engine/save-schema';
const SAVE_KEY = 'last-check.saves.v1';
const LEGACY_SAVE_KEY = 'last-check.save.v3';
const ENDINGS_KEY = 'last-check.endings.v1';
const PREFERENCES_KEY = 'last-check.preferences.v1';
const completedRaw = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tests/helpers/browser-save-fixture.ts'], { encoding:'utf8', maxBuffer:2*1024*1024 });
const completedDocument: SaveDocument = JSON.parse(completedRaw);

const url = '/lecture/last-check/';
async function waitSaved(page: Page) {
  await expect(page.getByLabel('저장 상태', {exact:true})).toContainText('저장 완료');
}
async function documentSaved(page: Page): Promise<SaveDocument> {
  await waitSaved(page);
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}
async function nextBlock(page: Page) {
  const block = page.locator('[data-block-id]');
  const id = await block.getAttribute('data-block-id');
  await page.getByRole('button',{name:'계속',exact:true}).click();
  await expect.poll(async () => await block.count() ? block.getAttribute('data-block-id') : null).not.toBe(id);
}
async function seedSession(page: Page) {
  await page.goto(url);
  await page.evaluate(({key,raw}) => { localStorage.clear(); localStorage.setItem(key,raw); },{key:SAVE_KEY,raw:completedRaw});
  await page.reload();
  await waitSaved(page);
}

test('typing writes no character saves; manual restore and reconnect retain the same block and one-time effects',async ({page}) => {
  await page.addInitScript(() => {
    Reflect.set(window,'saveWrites',0);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) { if (key==='last-check.saves.v1') Reflect.set(window,'saveWrites',Reflect.get(window,'saveWrites')+1); return original.call(this,key,value); };
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(url);
  await page.getByRole('button',{name:'CH01 시작',exact:true}).click();
  await waitSaved(page);
  const before = (await documentSaved(page)).auto!.state;
  const writes = await page.evaluate(()=>Reflect.get(window,'saveWrites'));
  const typed = page.locator('.story-block > span[aria-hidden="true"]').first();
  const count = (await typed.innerText()).length;
  await expect.poll(async () => (await typed.innerText()).length).toBeGreaterThan(count);
  expect(await page.evaluate(()=>Reflect.get(window,'saveWrites'))).toBe(writes);
  await page.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  await page.getByRole('button',{name:'슬롯 1 저장',exact:true}).click();
  await waitSaved(page);
  expect((await documentSaved(page)).manual[0]!.state.blockId).toBe(before.blockId);
  await page.getByRole('button',{name:'슬롯 1 불러오기',exact:true}).click();
  const restored = (await documentSaved(page)).auto!.state;
  expect(restored.runId).not.toBe(before.runId);
  expect(restored.parentRunId).toBe(before.runId);
  expect(restored.blockId).toBe(before.blockId);
  expect(restored.appliedEffects.filter(id=>id==='FX_CH01_ENTRY_E01')).toHaveLength(1);
  const raw = await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  await page.reload();
  await expect(page.locator(`[data-block-id="${before.blockId}"]`)).toBeVisible();
  expect((await documentSaved(page)).auto!.state).toEqual(restored);
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(raw);
});

test('completed source chapter branches have prefix-only data, C15 does not replay, profiles stay separate',async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const id = completedDocument.auto!.state.runId;
  await seedSession(page);
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.endings,ENDINGS_KEY)).toContain('END_TRUE');
  const original = (await documentSaved(page)).runs[id]!;
  await page.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  const caseBefore = await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  await page.getByRole('checkbox',{name:'대사 즉시 표시',exact:true}).check();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.preferences.instantText,PREFERENCES_KEY)).toBe(true);
  await expect(page.getByLabel('저장 상태',{exact:true})).toContainText('저장 완료');
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(caseBefore);
  await page.getByRole('button',{name:'CH07에서 분기',exact:true}).click();
  const forked = (await documentSaved(page)).auto!.state;
  expect(forked.runId).not.toBe(id);
  expect(forked.parentRunId).toBe(id);
  expect(forked.choiceHistory).toEqual(original.entries.CH07!.choiceHistory);
  expect(forked.evidence).not.toContain('E14');
  expect(forked.deductions).not.toContain('D6');
  expect(forked.revealedEvidenceSections).not.toContain('ESECTION_E14_01');
  await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click();
  while(await page.locator('[data-block-id]').count()) await nextBlock(page);
  await page.locator('[data-choice-id="C15_A"]').click();
  const selected = (await documentSaved(page)).auto!.state;
  expect(selected.relations.CHAR_JUNSEOK!.trust).toBe(Math.min(2,forked.relations.CHAR_JUNSEOK!.trust+1));
  expect(selected.relations.CHAR_SUHYEON).toEqual(forked.relations.CHAR_SUHYEON);
  await page.reload();
  const reloaded = await documentSaved(page);
  expect(reloaded.auto!.state).toEqual(selected);
  expect(reloaded.runs[id]).toEqual(original);
  expect(reloaded.auto!.state.appliedEffects.filter(effect=>effect==='FX_C15_A')).toHaveLength(1);
  await page.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'대사 즉시 표시',exact:true})).toBeChecked();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).endings,ENDINGS_KEY)).toEqual(['END_TRUE']);
});

test('protected original survives TITLE autosaves and restoring it creates a protected C24 child',async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const id = completedDocument.auto!.state.runId;
  await seedSession(page);
  const protectedOriginal = (await documentSaved(page)).runs[id]!.protected!;
  await page.getByRole('button',{name:'타이틀로',exact:true}).click();
  const title = await documentSaved(page);
  expect(title.auto!.state.evidence).toEqual([]);
  expect(title.runs[id]!.protected).toEqual(protectedOriginal);
  await page.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  await page.getByRole('button',{name:'완료 실행 1 지목전 보호본 불러오기',exact:true}).click();
  const child = await documentSaved(page), childId = child.auto!.state.runId;
  expect(child.auto!.state.parentRunId).toBe(id);
  expect(child.auto!.state.choiceHistory).toHaveLength(23);
  expect(child.auto!.state.displayStage).toBe('choice');
  expect(child.runs[childId]!.protected!.runId).toBe(childId);
  await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click();
  await page.locator('[data-choice-id="C24_A"]').click();
  const after = await documentSaved(page);
  expect(after.runs[id]!.protected).toEqual(protectedOriginal);
  expect(after.runs[childId]!.protected!.choiceHistory).toHaveLength(23);
  expect(after.auto!.state.choiceHistory).toHaveLength(24);
});

test('quota failure preserves durable bytes, continues in memory, and retries the current cursor',async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) { if(key==='last-check.saves.v1' && Reflect.get(window,'blockSave')) throw new DOMException('full','QuotaExceededError'); return original.call(this,key,value); };
  });
  await page.goto(url);
  await page.getByRole('button',{name:'CH01 시작',exact:true}).click();
  await waitSaved(page);
  const raw = await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  await page.evaluate(()=>Reflect.set(window,'blockSave',true));
  await nextBlock(page); await nextBlock(page);
  await expect(page.getByLabel('저장 상태',{exact:true})).toContainText('저장 실패');
  await expect(page.locator('[data-block-id="BLK_CH01_S01_03"]')).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(raw);
  await page.evaluate(()=>Reflect.set(window,'blockSave',false));
  await page.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  await page.getByRole('button',{name:'현재 진행 다시 저장',exact:true}).click();
  expect((await documentSaved(page)).auto!.state.blockId).toBe('BLK_CH01_S01_03');
  await page.reload();
  await expect(page.locator('[data-block-id="BLK_CH01_S01_03"]')).toBeVisible();
});

test('corrupt original is exportable and recovery backs it up before replacing it',async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const raw = '{"version":1,"broken":"preserve exactly"}';
  await page.goto(url);
  await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:SAVE_KEY,raw});
  await page.reload();
  await page.getByRole('button',{name:'CH01 시작',exact:true}).click();
  await expect(page.getByLabel('저장 상태',{exact:true})).toContainText('저장 실패');
  expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(raw);
  await page.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button',{name:'보전 원본 내보내기',exact:true}).click();
  const stream = await (await downloaded).createReadStream();
  let exported = ''; for await (const chunk of stream!) exported += chunk.toString();
  expect(exported).toBe(raw);
  await page.getByRole('button',{name:'원본 보관 후 새 저장 시작',exact:true}).click();
  expect((await documentSaved(page)).auto!.state.blockId).toBe('BLK_CH01_S01_01');
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('last-check.preserved.')).map(key=>localStorage.getItem(key)))).toContain(raw);
  expect(await page.evaluate(key=>localStorage.getItem(key),LEGACY_SAVE_KEY)).toBeNull();
});

test('two real tabs detect revision conflict and explicit reload replaces rather than merges disclosure',async ({page,context}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(url);
  await page.getByRole('button',{name:'CH01 시작',exact:true}).click();
  await waitSaved(page);
  const other = await context.newPage();
  await other.emulateMedia({reducedMotion:'reduce'});
  await other.goto(url);
  await nextBlock(page);
  const winner = await documentSaved(page);
  const raw = await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
  await expect(other.getByLabel('저장 상태',{exact:true})).toContainText('탭 충돌');
  await nextBlock(other); await nextBlock(other);
  await expect(other.locator('[data-block-id="BLK_CH01_S01_03"]')).toBeVisible();
  expect(await other.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(raw);
  await other.getByRole('button',{name:'저장/불러오기',exact:true}).click();
  await other.getByRole('button',{name:'다른 탭 자동 저장 불러오기',exact:true}).click();
  const restored = (await documentSaved(other)).auto!.state;
  expect(restored.blockId).toBe(winner.auto!.state.blockId);
  expect(restored.displayLog).toEqual(winner.auto!.state.displayLog);
  expect(restored.revealedBlocks).not.toContain('BLK_CH01_S01_02');
  await other.close();
});

test('blocked localStorage does not prevent starting or advancing in memory',async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) { if(key.startsWith('last-check.')) throw new DOMException('blocked','SecurityError'); return original.call(this,key); };
  });
  await page.goto(url);
  await page.getByRole('button',{name:'CH01 시작',exact:true}).click();
  await nextBlock(page);
  await expect(page.locator('[data-block-id="BLK_CH01_S01_02"]')).toBeVisible();
  await expect(page.getByLabel('저장 상태',{exact:true})).toContainText('저장 실패');
  await expect(page.getByRole('button',{name:'저장 문제 확인',exact:true})).toBeVisible();
});
