import { describe, expect, it } from 'vitest';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import type { ChoiceId, SceneId } from '../src/content/ids';
import { currentBlock, blockText } from '../src/engine/gameplay';
import { gameReducer } from '../src/engine/reducer';
import { createInitialState, serializeGameState, deserializeGameState, type RuntimeGameState } from '../src/engine/state';
import { parseGameContent } from '../src/content/schema';

type Setup = { evidence?: string[]; deductions?: string[]; flags?: Record<string, boolean | string>; trust?: number };
const proofEvidence = ['E03', 'E04', 'E05', 'E06', 'E07', 'E09', 'E10'];
const proofDeductions = ['D1', 'D2', 'D3', 'D4', 'D5'];
function begin(sceneId: SceneId, setup: Setup = {}): RuntimeGameState {
  const initial = createInitialState({ runId: 'RUN_FINAL_CONTENT', sceneId, seed: 123, characterIds: GAME_CONTENT.characters.map(c => c.id), flags: setup.flags ?? {} });
  return gameReducer({ ...initial, evidence: new Set(setup.evidence), deductions: new Set(setup.deductions), relations: { ...initial.relations, CHAR_EUNSEO: { trust: setup.trust ?? 0, suspicion: 0 } } }, { type: 'begin' });
}
function advance(state: RuntimeGameState): RuntimeGameState {
  return gameReducer(state, { type: 'continueBlock', blockId: state.blockId });
}
function finishScene(state: RuntimeGameState): RuntimeGameState {
  const sceneId = state.sceneId;
  for (let i = 0; i < 200 && state.sceneId === sceneId && ['block', 'result'].includes(state.displayStage); i += 1) state = advance(state);
  return state;
}
function choose(sceneId: SceneId, choiceId: ChoiceId, setup: Setup = {}): RuntimeGameState {
  const state = finishScene(begin(sceneId, setup));
  return gameReducer(state, { type: 'choose', choiceId, sceneId });
}
function text(state: RuntimeGameState): string { return blockText(currentBlock(state, GAME_INDEX)!, state); }
function proofSetup(extra: Setup = {}): Setup {
  return { evidence: proofEvidence, deductions: proofDeductions, ...extra, flags: { FLAG_FINAL_CHAIN: true, FLAG_FINAL_CHOICE: 'A', ...extra.flags } };
}

const trueRoute: ChoiceId[] = ['C01_A','C02_A','C03_B','C04_A','C05_B','C06_C','C07_A','C08_A','C09_A','C10_A','C11_A','C12_A','C13_A','C14_A','C15_C','C16_A','C17_A','C18_A','C19_A','C20_A','C21_A','C22_A','C23_A','C24_A'];
function play(route: ChoiceId[]): RuntimeGameState {
  let state = begin('CH01_S01');
  for (const choiceId of route) {
    while (['block', 'result'].includes(state.displayStage)) state = advance(state);
    state = gameReducer(state, { type: 'choose', choiceId, sceneId: state.sceneId });
  }
  return finishScene(state);
}

describe('final content route contracts', () => {
  it.each([
    { ending: 'END_TRUE', route: trueRoute },
    { ending: 'END_GOOD', route: trueRoute.map(id => id === 'C21_A' ? 'C21_B' : id) },
    { ending: 'END_BAD01', route: trueRoute.map(id => id === 'C12_A' ? 'C12_B' : id) },
    { ending: 'END_BAD02', route: ['C01_B','C02_B','C03_A','C04_B','C05_A','C06_B','C07_B','C08_B','C09_B','C10_C','C11_B','C12_B','C13_B','C14_B','C15_C','C16_B','C17_B','C18_B','C19_B','C20_B','C21_B','C22_B','C23_B','C24_B'] as ChoiceId[] },
  ])('reaches $ending through actual source choices and preserves all evidence across the ending', ({ ending, route }) => {
    const entered = play(route);
    expect(entered.sceneId).toBe(ending);
    let state = entered;
    while (state.displayStage !== 'complete') {
      const blockId = state.blockId!;
      const revealedBefore = new Set(state.revealedBlocks);
      expect(revealedBefore.has(blockId)).toBe(false);
      state = advance(deserializeGameState(serializeGameState(state)));
      expect(state.revealedBlocks.has(blockId)).toBe(true);
      expect(state.evidence).toEqual(entered.evidence);
      expect(state.deductions).toEqual(entered.deductions);
    }
    expect(state.flags.FLAG_OUTCOME).toBe(ending.replace('END_', ''));
    expect(state.revealedBlocks.has(`BLK_${ending}_FINAL_SENTENCE`)).toBe(true);
  });

  it.each([false, true])('C18_A respects E10 listening state (%s)', (held) => {
    const selected = choose('CH08_S01', 'C18_A', { evidence: held ? ['E09','E10'] : ['E09'] });
    expect(selected.deductions.has('D4')).toBe(held);
    expect(selected.relations.CHAR_JIHU!.suspicion).toBe(held ? 1 : 0);
    expect(text(selected)).toContain(held ? '단순히 네 건을 센 실수라면' : '특정 질문에 한 답을 아직 청취하지 않았어요.');
    expect(finishScene(selected).sceneId).toBe('CH08_S02');
  });

  for (const missing of ['D1','D2','D3','D4', ...proofEvidence, 'restored']) {
    it(`C20_A remains incomplete without ${missing}`, () => {
      const selected = choose('CH08_S03', 'C20_A', {
        evidence: proofEvidence.filter(id => id !== missing), deductions: ['D1','D2','D3','D4'].filter(id => id !== missing), flags: { FLAG_RESTORED: missing !== 'restored' },
      });
      expect(selected.deductions.has('D5')).toBe(false);
      expect(selected.flags.FLAG_FINAL_CHAIN).toBe(false);
      expect(text(selected)).toContain('아직 증명되지 않은 칸');
      expect(finishScene(selected).sceneId).toBe('CH09_S01');
    });
  }
  it('C20_A awards D5 only for the complete chain', () => {
    const selected = choose('CH08_S03', 'C20_A', { evidence: proofEvidence, deductions: ['D1','D2','D3','D4'], flags: { FLAG_RESTORED: true } });
    expect(selected.deductions.has('D5')).toBe(true);
    expect(selected.flags.FLAG_FINAL_CHAIN).toBe(true);
    expect(text(selected)).toContain('그 서류가 예약 마감을 통과시켰습니다.');
  });

  it.each([false,true])('C21_A is controlled by private_access, not current trust (%s)', (allowed) => {
    const state = finishScene(begin('CH09_S01', { trust: allowed ? -2 : 2, flags: { FLAG_PRIVATE_ACCESS: allowed } }));
    if (!allowed) {
      expect(() => gameReducer(state, { type:'choose', choiceId:'C21_A' })).toThrow('choice 조건 불충족');
      expect(() => begin('CH09_S01_A', { flags: { FLAG_PRIVATE_ACCESS:false } })).toThrow('scene 진입 조건 불충족');
    } else {
      const selected = gameReducer(state, { type:'choose', choiceId:'C21_A' });
      expect(selected.evidence.has('E14')).toBe(true);
      expect(selected.revealedEvidenceSections.size).toBe(0);
      expect(advance(selected).revealedEvidenceSections.has('ESECTION_E14_01')).toBe(true);
    }
    const skipped = gameReducer(state, { type:'choose', choiceId:'C21_B' });
    expect(skipped.evidence.has('E14')).toBe(false);
  });

  it.each(Array.from({length:16}, (_,mask) => ({ evidence:['E12','E14','E15','E16'].filter((_,i)=>mask & (1 << i)) })))('C23_A needs every family evidence item ($evidence)', ({ evidence }) => {
    const selected = choose('CH10_S01', 'C23_A', { evidence });
    expect(selected.deductions.has('D6')).toBe(evidence.length === 4);
    expect([...selected.evidence]).toEqual(evidence);
    expect(finishScene(selected).sceneId).toBe('CH10_S02');
  });

  it.each([...proofDeductions,...proofEvidence,'final_chain'])('a missing %s prevents proof at final submission', (missing) => {
    const setup: Setup = { evidence:proofEvidence.filter(id=>id!==missing), deductions:proofDeductions.filter(id=>id!==missing), flags:{FLAG_FINAL_CHAIN:missing!=='final_chain'} };
    const result=choose('CH10_S02','C24_A',setup);
    expect(finishScene(result).sceneId).toBe('END_BAD01');
  });
  it.each([false,true])('C24_B rejects incompatible E07/D3 (%s)', (hasE07) => {
    const state=finishScene(begin('CH10_S02', {evidence:hasE07?['E07']:[],deductions:hasE07?[]:['D3']}));
    expect(()=>gameReducer(state,{type:'choose',choiceId:'C24_B'})).toThrow('choice 조건 불충족');
  });
  it('C24_C cannot contradict proof and TITLE cannot be used early', () => {
    const state=finishScene(begin('CH10_S02',proofSetup()));
    expect(()=>gameReducer(state,{type:'choose',choiceId:'C24_C'})).toThrow('choice 조건 불충족');
    expect(()=>gameReducer(state,{type:'title',runId:'RUN_NEW',seed:1})).toThrow('종료 화면');
  });
});

describe('ending-specific conditional disclosure', () => {
  it.each([false,true])('GOOD preserves the correct E14 paragraph without retroactive E14 (%s)', (held) => {
    let state=begin('END_GOOD',proofSetup({evidence:[...proofEvidence,...(held?['E14']:[])]}));
    while(state.blockId!=='BLK_END_GOOD_E14') state=advance(state);
    expect(state.revealedNotebookEntries.has(`NOTE_END_GOOD_${held?'HAS':'MISSING'}_E14`)).toBe(false);
    expect(text(state)).toContain(held?'편지를 받았다는 사실은 확인했다.':'그 안에 무엇이 있었는지');
    const after=advance(state);
    expect(after.revealedNotebookEntries.has(`NOTE_END_GOOD_${held?'HAS':'MISSING'}_E14`)).toBe(true);
    expect(after.evidence.has('E14')).toBe(held);
  });

  it.each(['A','C'])('BAD01 displays C24_A-only dialogue only on %s', (choice) => {
    let state=begin('END_BAD01',{flags:{FLAG_FINAL_CHOICE:choice}});
    const seen:string[]=[];
    while(state.displayStage!=='complete'){seen.push(text(state));state=advance(state);}
    expect(seen.some(line=>line.includes('이름은 맞게 썼다고 생각해.'))).toBe(choice==='A');
    expect(seen.some(line=>line.includes('이름을 쓴 근거가 빈칸을 대신할 수는 없습니다.'))).toBe(choice==='A');
  });
  it.each([0,1,2,3,4])('BAD01 reveals only the first missing D block (prefix length %s)', (prefix) => {
    let state=begin('END_BAD01',{deductions:['D1','D2','D3','D4'].slice(0,prefix),flags:{FLAG_FINAL_CHOICE:'C'}});
    while(state.blockId!=='BLK_END_BAD01_REVIEW')state=advance(state);
    const expected=`VAR_END_BAD01_${prefix===4?'CONNECTION_FAILED':`MISSING_D${prefix+1}`}`;
    expect(state.resolvedVariantId).toBe(expected);
    const restored=deserializeGameState(serializeGameState(state));
    const after=advance(restored);
    expect([...after.revealedNotebookEntries].filter(id=>/^NOTE_END_BAD01_(?:MISSING_D|CONNECTION_FAILED)/.test(id))).toEqual([expected.replace('VAR_','NOTE_')]);
    expect(after.deductions).toEqual(state.deductions);
    expect(after.evidence).toEqual(state.evidence);
  });

  it('shows the closing line after the ending card and TITLE starts a clean child run', () => {
    let state=begin('END_BAD02',{flags:{FLAG_FINAL_CHOICE:'B'}});
    while(currentBlock(state,GAME_INDEX)!.kind!=='endingCard')state=advance(state);
    state=advance(state);
    expect(currentBlock(state,GAME_INDEX)!.kind).toBe('closingLine');
    expect(()=>gameReducer(state,{type:'title',runId:'RUN_NEXT',seed:2})).toThrow('종료 화면');
    const completed=advance(state);
    const next=gameReducer(completed,{type:'title',runId:'RUN_NEXT',seed:2});
    expect(next.sceneId).toBe('CH01_S01');
    expect(next.displayStage).toBe('scene');
    expect(next.parentRunId).toBe(completed.runId);
    expect(next.evidence.size).toBe(0);
    expect(next.deductions.size).toBe(0);
    expect(next.appliedEffects.size).toBe(0);
    expect(next.revealedBlocks.size).toBe(0);
    expect(GAME_INDEX.scenes.has('TITLE')).toBe(false);
  });

  it('resumes an older saved pending boundary without replaying its result effects', () => {
    const result=choose('CH07_S03','C17_B');
    const saved:RuntimeGameState={...result,blockId:null,displayStage:'complete',blockDisplay:'complete',blockedNextSceneId:'CH08_S01'};
    const restored=deserializeGameState(serializeGameState(saved));
    const continued=gameReducer(restored,{type:'continueBlock',blockId:null});
    expect(continued.sceneId).toBe('CH08_S01');
    expect(continued.appliedEffects).toEqual(restored.appliedEffects);
    expect(continued.evidence).toEqual(restored.evidence);
    expect(continued.relations).toEqual(restored.relations);
    expect(gameReducer(continued,{type:'continueBlock',blockId:null})).toBe(continued);
  });

  it('rejects undefined conditional routes and non-TITLE end commands', () => {
    const content=structuredClone(GAME_CONTENT);
    const scene=content.chapters.at(-1)!.scenes.find(s=>s.id==='CH10_S02_A')!;
    scene.nextVariants![0]!.sceneId='CH99_S01';
    expect(()=>parseGameContent(content)).toThrow('알 수 없는 next scene ID');
    const invalid=structuredClone(GAME_CONTENT);
    const invalidEnding: Record<string, unknown> = invalid.chapters.at(-1)!.scenes.find(s=>s.id==='END_TRUE')!;
    invalidEnding.endCommand='END_FALSE';
    expect(()=>parseGameContent(invalid)).toThrow();
  });
});
