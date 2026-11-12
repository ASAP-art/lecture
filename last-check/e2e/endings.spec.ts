import { expect, test, type Page } from '@playwright/test';
import { startFromTitle } from './helpers/start';

const trueRoute = ['C01_A','C02_A','C03_B','C04_A','C05_B','C06_C','C07_A','C08_A','C09_A','C10_A','C11_A','C12_A','C13_A','C14_A','C15_C','C16_A','C17_A','C18_A','C19_A','C20_A','C21_A','C22_A','C23_A','C24_A'];
const bad02Route = ['C01_B','C02_B','C03_A','C04_B','C05_A','C06_B','C07_B','C08_B','C09_B','C10_C','C11_B','C12_B','C13_B','C14_B','C15_C','C16_B','C17_B','C18_B','C19_B','C20_B','C21_B','C22_B','C23_B','C24_B'];
const privateTitles = {
  E12:'이미 은서가 보관한 친모 관련 원본 일부',
  E14:'지후의 이경 고발 진술 초안·17:10 수령 서명',
  E15:'25년 전 위조 서류와 친모의 미동의 기록',
  E16:'이경의 사후 메모: 원본 전달·지후 독립 증언·자기 재산 정리',
};
type RouteTrace = {
  injection: 'none; fresh title and real UI choices';
  clickedChoiceIds: string[];
  observed: { scene: string; block: string | null }[];
  ending?: { scene: string; evidence: string[]; deductions: string[]; outcome: unknown };
  title?: { scene: string; evidence: string[]; deductions: string[] };
};
async function observe(page: Page, trace: RouteTrace) {
  const scene = await page.locator('.scene-strip span').first().innerText();
  const blocks = page.locator('[data-block-id]');
  const block = await blocks.count() ? await blocks.getAttribute('data-block-id') : null;
  trace.observed.push({ scene, block });
  await expect(page.locator('.dialogue-panel')).not.toContainText(/undefined|NaN|FLAG_[A-Z_]+|(?:hasEvidence|hasDeduction|proof)\s*[:(]|SRC_|VAR_END_|TODO|DEBUG/);
  await expect(page.getByText(/숨은 증거|비밀 슬롯|미획득 증거 \d/)).toHaveCount(0);
}
async function nextBlock(page: Page, trace: RouteTrace) {
  const block = page.locator('[data-block-id]');
  const previous = await block.getAttribute('data-block-id');
  await observe(page, trace);
  await page.getByRole('button',{name:'계속',exact:true}).click();
  await expect.poll(async()=>await block.count()?block.getAttribute('data-block-id'):null).not.toBe(previous);
}
async function saved(page: Page) {
  await expect(page.getByLabel('저장 상태', { exact: true })).toContainText('저장 완료');
  return page.evaluate(() => JSON.parse(localStorage.getItem('last-check.saves.v1')!).auto.state);
}

for (const scenario of [
  {name:'TRUE',ending:'END_TRUE',route:trueRoute},
  {name:'GOOD without E14',ending:'END_GOOD',route:trueRoute.map(id=>id==='C21_A'?'C21_B':id)},
  {name:'GOOD with E14',ending:'END_GOOD',route:trueRoute.map(id=>id==='C22_A'?'C22_B':id)},
  {name:'GOOD C11_B + C21_B',ending:'END_GOOD',route:trueRoute.map(id=>id==='C11_A'?'C11_B':id==='C21_A'?'C21_B':id)},
  {name:'BAD01 accusation',ending:'END_BAD01',route:trueRoute.map(id=>id==='C12_A'?'C12_B':id)},
  {name:'BAD01 insufficient proof',ending:'END_BAD01',route:trueRoute.map(id=>id==='C12_A'?'C12_B':id==='C24_A'?'C24_C':id)},
  {name:'BAD01 D6 only',ending:'END_BAD01',route:trueRoute.map(id=>(({
    C12_A:'C12_B', C16_A:'C16_B', C17_A:'C17_B', C18_A:'C18_B', C20_A:'C20_B',
  } as Record<string,string>)[id]??id))},
  {name:'BAD02',ending:'END_BAD02',route:bad02Route},
]) {
  test(`${scenario.name}: source route, private hiding, ending disclosure and TITLE`,async({page},testInfo)=>{
    test.setTimeout(180_000);
    const trace: RouteTrace = { injection:'none; fresh title and real UI choices', clickedChoiceIds:[], observed:[] };
    const diagnostics: { kind: string; message: string }[] = [];
    page.on('console', message => { if (['warning','error'].includes(message.type())) diagnostics.push({kind:`console.${message.type()}`,message:message.text()}); });
    page.on('pageerror', error => diagnostics.push({kind:'pageerror',message:error.message}));
    page.on('response', response => { if(response.status()>=400) diagnostics.push({kind:'http',message:`${response.status()} ${response.url()}`}); });
    page.on('requestfailed', request => diagnostics.push({kind:'requestfailed',message:`${request.method()} ${request.url()}: ${request.failure()?.errorText}`}));
    try {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/lecture/last-check/');
    await expect(page.locator('img.stage-art-illustration')).toBeVisible();
    await page.evaluate(()=>localStorage.clear());
    await page.reload();
    await expect(page.locator('img.stage-art-illustration')).toBeVisible();
    await startFromTitle(page);
    for(const choiceId of scenario.route){
      while(await page.locator('[data-block-id]').count())await nextBlock(page,trace);
      if(choiceId.startsWith('C23_')){
        const state=await saved(page);
        await page.getByRole('button',{name:/수첩/}).click();
        for(const [id,title] of Object.entries(privateTitles)){
          if(!state.evidence.includes(id)) {
            await expect(page.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
            await expect(page.locator('.notebook')).not.toContainText(id);
          }
        }
        await expect(page.getByText(/숨은 증거|비밀 슬롯|미획득 증거 \d/)).toHaveCount(0);
        await page.getByRole('button',{name:/수첩/}).click();
      }
      if(choiceId.startsWith('C24_')){
        const state=await saved(page);
        if(state.evidence.includes('E07')||state.deductions.includes('D3'))await expect(page.locator('[data-choice-id="C24_B"]')).toBeDisabled();
        if(state.deductions.includes('D5')&&state.flags.FLAG_FINAL_CHAIN)await expect(page.locator('[data-choice-id="C24_C"]')).toBeDisabled();
        await expect(page.locator('.choice-list')).not.toContainText('proof');
      }
      await observe(page,trace);
      await page.locator(`[data-choice-id="${choiceId}"]`).click();
      trace.clickedChoiceIds.push(choiceId);
    }
    while((await page.locator('.scene-strip span').first().innerText()).startsWith('CH10_'))await nextBlock(page,trace);
    await expect.poll(async()=>(await saved(page)).sceneId).toBe(scenario.ending);
    const before=await saved(page);
    if(scenario.name==='BAD01 D6 only')expect(before.deductions).toEqual(['D6']);
    if(scenario.name==='GOOD without E14'||scenario.name==='GOOD C11_B + C21_B')expect(before.evidence).not.toContain('E14');
    if(scenario.name==='GOOD with E14')expect(before.evidence).toContain('E14');
    const seen:string[]=[];
    const blockIds:string[]=[];
    while(await page.locator('[data-block-id]').count()){
      const block=page.locator('[data-block-id]');
      const id=(await block.getAttribute('data-block-id'))!;
      blockIds.push(id);
      seen.push(await block.innerText());
      if(id==='BLK_END_GOOD_E14'){
        const held=before.evidence.includes('E14');
        await expect(block).toContainText(held?'편지를 받았다는 사실은 확인했다.':'그 안에 무엇이 있었는지');
      }
      await nextBlock(page,trace);
      const during=await saved(page);
      expect(during.evidence).toEqual(before.evidence);
      expect(during.deductions).toEqual(before.deductions);
    }
    expect(blockIds.at(-1)).toBe(`BLK_${scenario.ending}_FINAL_SENTENCE`);
    expect(seen.at(-2)).toContain('ENDING');
    if(scenario.ending==='END_BAD01'){
      expect(seen.some(line=>line.includes('이름은 맞게 썼다고 생각해.'))).toBe(scenario.route.at(-1)==='C24_A');
      expect(blockIds.filter(id=>id==='BLK_END_BAD01_REVIEW')).toHaveLength(1);
      expect(blockIds.includes('BLK_END_BAD01_06')).toBe(scenario.route.at(-1)==='C24_A');
      expect(blockIds.includes('BLK_END_BAD01_07')).toBe(scenario.route.at(-1)==='C24_A');
      const review=seen[blockIds.indexOf('BLK_END_BAD01_REVIEW')];
      const missing= ['D1','D2','D3','D4'].find(id=>!before.deductions.includes(id));
      expect(review).toContain(({
        D1:'지후 씨 건은 퇴실이 아니라 입실이에요.',
        D2:'HAND는 7시 46분이네요.',
        D3:'이 이름은 그날의 행위자가 아니에요.',
        D4:'남아 있으라고 한 사람이, 5초 뒤에는 아무도 없다고 했습니다.',
        connected:'최종 의견에 연결하지 못했습니다.',
      } as Record<string,string>)[missing??'connected']);
    }
    const final=await saved(page);
    expect(final.evidence).toEqual(before.evidence);
    expect(final.deductions).toEqual(before.deductions);
    expect(new Set(blockIds).size).toBe(blockIds.length);
    if(scenario.ending==='END_TRUE'){
      expect(blockIds).toHaveLength(73);
      expect(seen.join('\n')).toContain('내가 증언하는 건 내 선택이고, 내가 죽인 것도 내 책임이에요.');
    }
    if(scenario.ending==='END_GOOD')expect(blockIds).toHaveLength(33);
    if(scenario.ending==='END_BAD02'){
      expect(blockIds).toHaveLength(39);
      expect(seen.join('\n')).toContain('법원이 명백한 반증을 무시해 유죄를 확정하는 장면은 없다.');
    }
    expect(final.flags.FLAG_OUTCOME).toBe(scenario.ending.replace('END_',''));
    trace.ending={scene:final.sceneId,evidence:final.evidence,deductions:final.deductions,outcome:final.flags.FLAG_OUTCOME};
    await expect(page.getByText(/확인한 사실과, 그 사실로 답할 수 있는 질문은 같은 것이 아니었다./)).toBeVisible();
    await page.getByRole('button',{name:'타이틀로',exact:true}).click();
    await expect(page.locator('img.stage-art-illustration')).toBeVisible();
    await expect(page.getByRole('button',{name:'게임 시작',exact:true})).toBeVisible();
    await expect.poll(async()=>(await saved(page)).evidence).toEqual([]);
    await expect.poll(async()=>(await saved(page)).deductions).toEqual([]);
    expect((await saved(page)).parentRunId).toBe(final.runId);
    const title=await saved(page);
    trace.title={scene:title.sceneId,evidence:title.evidence,deductions:title.deductions};
    expect(trace.clickedChoiceIds).toEqual(scenario.route);
    expect(diagnostics.filter(item=>item.kind!=='console.warning')).toEqual([]);
    } finally {
      await testInfo.attach('actual-route.json',{body:JSON.stringify(trace,null,2),contentType:'application/json'});
      await testInfo.attach('browser-diagnostics.json',{body:JSON.stringify(diagnostics,null,2),contentType:'application/json'});
    }
  });
}
