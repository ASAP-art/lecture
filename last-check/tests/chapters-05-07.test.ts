import { describe, expect, it } from 'vitest';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import type { ChoiceId, SceneId } from '../src/content/ids';
import { blockText, currentBlock } from '../src/engine/gameplay';
import { gameReducer } from '../src/engine/reducer';
import { createInitialState, deserializeGameState, serializeGameState, getInsight, type RuntimeGameState } from '../src/engine/state';
import { applyEffectDefinition } from '../src/engine/transition';
import { parseGameContent } from '../src/content/schema';

function begin(sceneId: SceneId, evidence: string[] = [], trust = 0): RuntimeGameState {
  const initial = createInitialState({ runId: 'RUN_CH0507', sceneId, seed: 5, characterIds: GAME_CONTENT.characters.map(c => c.id) });
  return gameReducer({ ...initial, evidence: new Set(evidence), relations: {
    ...initial.relations,
    CHAR_EUNSEO: { trust, suspicion: 0 },
  } }, { type: 'begin' });
}
function advance(state: RuntimeGameState, count = 1): RuntimeGameState {
  for (let i = 0; i < count; i += 1) state = gameReducer(state, { type: 'continueBlock', blockId: state.blockId! });
  return state;
}
function finish(state: RuntimeGameState): RuntimeGameState {
  return advance(state, GAME_INDEX.scenes.get(state.sceneId)!.blocks.length - state.blockCursor);
}
function choose(state: RuntimeGameState, choiceId: ChoiceId): RuntimeGameState {
  return gameReducer(state, { type: 'choose', choiceId, sceneId: state.sceneId });
}

const routes = [
  ['CH05_S01', 'C10_A', 'CH05_S01_A', 'CH05_S02', 'CHAR_EUNSEO', 'trust', 2],
  ['CH05_S01', 'C10_B', 'CH05_S01_B', 'CH05_S02', 'CHAR_JIHU', 'suspicion', 1],
  ['CH05_S01', 'C10_C', 'CH05_S01_C', 'CH05_S02', 'CHAR_IKYEONG', 'trust', 1],
  ['CH05_S02', 'C11_A', 'CH05_S02_A', 'CH05_S03', 'CHAR_EUNSEO', 'trust', 2],
  ['CH05_S02', 'C11_B', 'CH05_S02_B', 'CH05_S03', 'CHAR_EUNSEO', 'trust', 1],
  ['CH05_S03', 'C12_A', 'CH05_S03_A', 'CH06_S01', 'CHAR_SUHYEON', 'suspicion', 0],
  ['CH05_S03', 'C12_B', 'CH05_S03_B', 'CH06_S01', 'CHAR_SUHYEON', 'suspicion', 1],
  ['CH06_S01', 'C13_A', 'CH06_S01_A', 'CH06_S02', 'CHAR_JIHU', 'suspicion', 1],
  ['CH06_S01', 'C13_B', 'CH06_S01_B', 'CH06_S02', 'CHAR_JIHU', 'trust', -1],
  ['CH06_S02', 'C14_A', 'CH06_S02_A', 'CH07_S01', 'CHAR_SUHYEON', 'trust', 1],
  ['CH06_S02', 'C14_B', 'CH06_S02_B', 'CH07_S01', 'CHAR_SUHYEON', 'trust', 1],
  ['CH06_S02', 'C14_C', 'CH06_S02_C', 'CH07_S01', 'CHAR_IKYEONG', 'trust', 1],
  ['CH07_S01', 'C15_A', 'CH07_S01_A', 'CH07_S02', 'CHAR_JUNSEOK', 'trust', 1],
  ['CH07_S01', 'C15_B', 'CH07_S01_B', 'CH07_S02', 'CHAR_JUNSEOK', 'trust', 1],
  ['CH07_S01', 'C15_C', 'CH07_S01_C', 'CH07_S02', 'CHAR_SUHYEON', 'trust', 1],
  ['CH07_S02', 'C16_A', 'CH07_S02_A', 'CH07_S03', 'CHAR_IKYEONG', 'suspicion', 1],
  ['CH07_S02', 'C16_B', 'CH07_S02_B', 'CH07_S03', 'CHAR_SUHYEON', 'trust', 1],
  ['CH07_S03', 'C17_A', 'CH07_S03_A', 'CH08_S01', 'CHAR_IKYEONG', 'suspicion', 0],
  ['CH07_S03', 'C17_B', 'CH07_S03_B', 'CH08_S01', 'CHAR_IKYEONG', 'suspicion', 1],
] as const;

describe('CH05–CH07 source routes and effects', () => {
  it.each(routes)('%s / %s follows the full result before source next', (sceneId, choiceId, result, next, character, field, value) => {
    const selected = choose(finish(begin(sceneId, ['E04', 'E05', 'E06', 'E07'], 1)), choiceId);
    expect(selected.sceneId).toBe(result);
    expect(selected.relations[character]![field]).toBe(value);
    const completed = finish(selected);
    expect(completed.sceneId).toBe(next);
    expect(completed.blockedNextSceneId).toBeNull();
  });

  it.each([-2, -1, 0, 1, 2])('enforces C11_A consent at trust %s in both choice and scene entry', (trust) => {
    const atChoice = finish(begin('CH05_S02', [], trust));
    if (trust < 1) {
      expect(() => choose(atChoice, 'C11_A')).toThrow('choice 조건 불충족');
      expect(() => begin('CH05_S02_A', [], trust)).toThrow('scene 진입 조건 불충족');
    } else {
      expect(choose(atChoice, 'C11_A').sceneId).toBe('CH05_S02_A');
    }
    expect(choose(atChoice, 'C11_B').evidence.has('E12')).toBe(false);
  });

  it('acquires E12/E15 together but discloses only each completed private paragraph', () => {
    let state = choose(finish(begin('CH05_S02', [], 1)), 'C11_A');
    expect([...state.evidence].sort()).toEqual(['E12', 'E15']);
    expect(state.flags.FLAG_PRIVATE_ACCESS).toBe(true);
    expect(state.revealedEvidenceSections.size).toBe(0);
    const blocks = GAME_INDEX.scenes.get('CH05_S02_A')!.blocks;
    for (let i = 0; i < blocks.length; i += 1) {
      const currentId = state.blockId;
      const persisted = deserializeGameState(serializeGameState(state));
      expect(persisted.blockId).toBe(currentId);
      expect(persisted.revealedEvidenceSections.size).toBe(i);
      state = advance(persisted);
      expect(state.revealedEvidenceSections.size).toBe(i + 1);
    }
    expect(state.sceneId).toBe('CH05_S03');
    expect(state.relations.CHAR_EUNSEO!.trust).toBe(2);
  });

  it.each([['CH05_S01', 'E13'], ['CH06_S01', 'E09']] as const)('%s grants common evidence without disclosing its full text on entry', (sceneId, evidence) => {
    const started = begin(sceneId);
    expect(started.evidence.has(evidence)).toBe(true);
    expect(started.revealedEvidenceSections.size).toBe(0);
    expect(finish(started).revealedEvidenceSections.has(`ESECTION_${evidence}_COMMON`)).toBe(true);
  });

  it.each(['C12_A', 'C12_B'] as const)('%s never auto-restores missing analysis or evidence', (choiceId) => {
    const result = choose(finish(begin('CH05_S03', ['E05', 'E06'])), choiceId);
    expect(result.deductions.has('D1')).toBe(choiceId === 'C12_A');
    expect(getInsight(result)).toBe(choiceId === 'C12_A' ? 1 : 0);
    expect([...result.evidence].sort()).toEqual(['E05', 'E06']);
    expect(result.flags.FLAG_RESTORED).not.toBe(true);
  });

  it.each(['C14_B', 'C14_C'] as const)('%s does not grant the unheard E10 call', (choiceId) => {
    const result = choose(finish(begin('CH06_S02', ['E09'])), choiceId);
    expect([...result.evidence]).toEqual(['E09']);
    expect(result.revealedEvidenceSections.size).toBe(0);
  });
});

describe('C15 confirmed reward contract', () => {
  for (const [choice, evidence, character] of [
    ['C15_A', 'E07', 'CHAR_JUNSEOK'], ['C15_B', 'E04', 'CHAR_JUNSEOK'], ['C15_C', 'E11', 'CHAR_SUHYEON'],
  ] as const) {
    it.each([false, true])(`${choice} grants only ${evidence}, with one relationship increment (already held: %s)`, (alreadyHeld) => {
      let atChoice = finish(begin('CH07_S01', alreadyHeld ? [evidence] : []));
      const selected = choose(atChoice, choice);
      expect([...selected.evidence]).toEqual([evidence]);
      expect(selected.relations[character]!.trust).toBe(1);
      expect(selected.revealedEvidenceSections.size).toBe(0);
      const restored = deserializeGameState(serializeGameState(selected));
      expect(blockText(currentBlock(restored, GAME_INDEX)!, restored)).toBe(blockText(currentBlock(selected, GAME_INDEX)!, selected));
      const replayed = gameReducer(restored, { type: 'choose', choiceId: choice, sceneId: 'CH07_S01' });
      expect(replayed).toBe(restored);
      expect(applyEffectDefinition(restored, GAME_INDEX.effects.get(`FX_${choice}`)!)).toBe(restored);
      const completed = finish(restored);
      expect(completed.relations[character]!.trust).toBe(1);
      expect(completed.revealedEvidenceSections.size).toBe(1);
    });
    it.each([1, 2])(`${choice} keeps earlier trust distinct and caps at two (initial %s)`, (initialTrust) => {
      const started = begin('CH07_S01', [evidence]);
      const state = { ...started, relations: { ...started.relations, [character]: { trust: initialTrust, suspicion: 0 } } };
      expect(choose(finish(state), choice).relations[character]!.trust).toBe(2);
    });
  }
});

describe('C16/C17 evidence-dependent conclusions', () => {
  it.each([false, true])('C16_A resolves the E07 result once, with no D2 on missing E07 (%s)', (held) => {
    const selected = choose(finish(begin('CH07_S02', held ? ['E07'] : [])), 'C16_A');
    expect(selected.deductions.has('D2')).toBe(held);
    expect(selected.relations.CHAR_IKYEONG!.suspicion).toBe(held ? 1 : 0);
    expect(blockText(currentBlock(selected, GAME_INDEX)!, selected)).toContain(held ? '7시 40분 이동이 먼저다.' : '지금은 후보 시간표예요.');
    const restored = deserializeGameState(serializeGameState(selected));
    expect(restored.resolvedVariants).toEqual(selected.resolvedVariants);
    const completed = finish(restored);
    expect(completed.revealedNotebookEntries.has(held ? 'NOTE_CH07_S02_A_HAS_E07' : 'NOTE_CH07_S02_A_MISSING_E07')).toBe(true);
    expect(completed.deductions.has('D2')).toBe(held);
  });

  it('C16_B grants E10 only, without D2 or E07 and without merging the E09 call', () => {
    const selected = choose(finish(begin('CH07_S02')), 'C16_B');
    expect([...selected.evidence]).toEqual(['E10']);
    expect([...selected.deductions]).toEqual([]);
    expect(selected.relations.CHAR_SUHYEON!.trust).toBe(1);
    expect(selected.revealedEvidenceSections.size).toBe(0);
    const completed = finish(selected);
    expect(completed.revealedEvidenceSections.has('ESECTION_E10_CH07_S02_B')).toBe(true);
    expect(completed.evidence.has('E09')).toBe(false);
  });

  it.each([[], ['E04'], ['E06'], ['E04', 'E06']].map(evidence => ({ evidence })))('C17_A requires both E04 and E06 for D3 ($evidence)', ({ evidence }) => {
    const selected = choose(finish(begin('CH07_S03', evidence)), 'C17_A');
    expect(selected.deductions.has('D3')).toBe(evidence.includes('E04') && evidence.includes('E06'));
    const restored = deserializeGameState(serializeGameState(selected));
    expect(finish(restored).deductions).toEqual(selected.deductions);
  });


  it('rejects unknown IDs inside effect and document confirmation conditions', () => {
    const content = structuredClone(GAME_CONTENT);
    content.effects[0]!.condition = { op: 'hasEvidence', evidenceId: 'E99' };
    expect(() => parseGameContent(content)).toThrow('알 수 없는 evidence ID: E99');
    delete content.effects[0]!.condition;
    content.chapters[0]!.scenes[0]!.blocks[0]!.confirmationCondition = { op: 'hasEvidence', evidenceId: 'E99' };
    expect(() => parseGameContent(content)).toThrow('알 수 없는 evidence ID: E99');
  });
});
