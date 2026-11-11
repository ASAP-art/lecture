import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import { blockText, currentBlock } from '../src/engine/gameplay';
import { gameReducer } from '../src/engine/reducer';
import { createInitialState, deserializeGameState, serializeGameState, type RuntimeGameState } from '../src/engine/state';
import { applyEffectDefinition } from '../src/engine/transition';
import { TRUE_WITNESS } from './fixtures/decision-oracle';
import { advance, choiceState, finishEnding, finishResult, play, select } from './helpers/engine-walk';
const sorted = (values: ReadonlySet<string>) => [...values].sort();

// Audit gaps only: the existing C15 matrix covers zero trust with/without the
// evidence, and positive trust with evidence. Negative trust and positive trust
// without evidence were untested. These are injected boundaries, not routes.
describe('full QA: synthetic C15 reward boundaries missing from the existing matrix', () => {
  for (const [choice, evidence, character] of [
    ['C15_A', 'E07', 'CHAR_JUNSEOK'],
    ['C15_B', 'E04', 'CHAR_JUNSEOK'],
    ['C15_C', 'E11', 'CHAR_SUHYEON'],
  ] as const) {
    for (const initialTrust of [-2, -1, 1, 2]) {
      for (const held of initialTrust < 0 ? [false, true] : [false]) {
        it(`${choice}: initial trust ${initialTrust}, evidence held ${held}; restore/replay is isolated`, () => {
          const base = choiceState('CH07_S01');
          const before: RuntimeGameState = {
            ...base,
            evidence: new Set(['E01', ...(held ? [evidence] : [])]),
            relations: {
              ...base.relations,
              [character]: { trust: initialTrust, suspicion: 2 },
            },
          };
          const originalBytes = serializeGameState(before);
          const selected = select(before, choice);
          const expectedTrust = Math.min(2, initialTrust + 1);
          assert.deepEqual(sorted(selected.evidence), ['E01', evidence].sort());
          assert.deepEqual(selected.deductions, before.deductions);
          assert.deepEqual(selected.relations, {
            ...before.relations,
            [character]: { trust: expectedTrust, suspicion: 2 },
          });
          const restored = deserializeGameState(serializeGameState(selected));
          assert.deepEqual(restored.relations, selected.relations);
          assert.equal(applyEffectDefinition(restored, GAME_INDEX.effects.get(`FX_${choice}`)!), restored);
          assert.equal(gameReducer(restored, { type: 'choose', choiceId: choice, sceneId: 'CH07_S01' }), restored);
          const completed = finishResult(restored);
          assert.equal(completed.sceneId, 'CH07_S02');
          assert.deepEqual(completed.relations, selected.relations);
          assert.deepEqual(completed.evidence, selected.evidence);
          assert.deepEqual(completed.deductions, before.deductions);
          assert.equal(serializeGameState(before), originalBytes);
        });
      }
    }
  }
});

// Existing real walks proved D6 cannot replace D1/D5, but retained D2/D3/D4.
// This exact walk earns D6 alone, and exercises both legal BAD01 submissions.
describe('full QA: real-choice D6-only walks', () => {
  for (const finalChoice of ['C24_A', 'C24_C']) {
    it(`${finalChoice}: D6 alone stays BAD01 through every ending block`, () => {
      const substitutions: Readonly<Record<string, string>> = {
        C12_A: 'C12_B', C16_A: 'C16_B', C17_A: 'C17_B',
        C18_A: 'C18_B', C20_A: 'C20_B', C24_A: finalChoice,
      };
      const entered = play(TRUE_WITNESS.map(id => substitutions[id] ?? id));
      assert.equal(entered.sceneId, 'END_BAD01');
      assert.deepEqual(sorted(entered.deductions), ['D6']);
      const evidence = sorted(entered.evidence);
      let state = entered;
      const seen: string[] = [];
      while (state.displayStage !== 'complete') {
        const block = currentBlock(state, GAME_INDEX)!;
        seen.push(blockText(block, state));
        if (block.id === 'BLK_END_BAD01_REVIEW') {
          assert.equal(state.resolvedVariantId, 'VAR_END_BAD01_MISSING_D1');
        }
        state = advance(deserializeGameState(serializeGameState(state)));
        assert.deepEqual(sorted(state.deductions), ['D6']);
        assert.deepEqual(sorted(state.evidence), evidence);
      }
      assert.equal(state.flags.FLAG_FINAL_CHOICE, finalChoice.slice(-1));
      assert.equal(seen.some(text => text.includes('이름은 맞게 썼다고 생각해.')), finalChoice === 'C24_A');
      assert.equal(seen.some(text => text.includes('이름을 쓴 근거가 빈칸을 대신할 수는 없습니다.')), finalChoice === 'C24_A');
      assert(state.revealedNotebookEntries.has('NOTE_END_BAD01_MISSING_D1'));
    });
  }
});

// Boundary paragraph tests and real ending-persistence tests existed separately;
// join them here so actual acquired E14 controls the disclosed GOOD notebook.
describe('full QA: real-choice GOOD disclosure', () => {
  for (const held of [false, true]) {
    it(`GOOD with E14 ${held} discloses only its own paragraph after restore`, () => {
      const route = TRUE_WITNESS.map(id => held
        ? id === 'C22_A' ? 'C22_B' : id
        : id === 'C11_A' ? 'C11_B' : id === 'C21_A' ? 'C21_B' : id);
      let state = play(route);
      assert.equal(state.sceneId, 'END_GOOD');
      assert.equal(state.evidence.has('E14'), held);
      if (!held) for (const id of ['E12', 'E14', 'E15']) assert(!state.evidence.has(id));
      const evidence = sorted(state.evidence);
      const deductions = sorted(state.deductions);
      while (state.blockId !== 'BLK_END_GOOD_E14') {
        assert.notEqual(state.displayStage, 'complete');
        state = advance(state);
      }
      const matchingNote = `NOTE_END_GOOD_${held ? 'HAS' : 'MISSING'}_E14`;
      const oppositeNote = `NOTE_END_GOOD_${held ? 'MISSING' : 'HAS'}_E14`;
      assert(!state.revealedNotebookEntries.has(matchingNote));
      assert(!state.revealedNotebookEntries.has(oppositeNote));
      const paragraph = blockText(currentBlock(state, GAME_INDEX)!, state);
      assert(paragraph.includes(held ? '편지를 받았다는 사실은 확인했다.' : '그 안에 무엇이 있었는지'));
      state = advance(deserializeGameState(serializeGameState(state)));
      assert(state.revealedNotebookEntries.has(matchingNote));
      assert(!state.revealedNotebookEntries.has(oppositeNote));
      assert.equal(GAME_INDEX.notebookEntries.get(matchingNote)!.body, paragraph);
      const completed = finishEnding(state);
      assert.deepEqual(sorted(completed.evidence), evidence);
      assert.deepEqual(sorted(completed.deductions), deductions);
      assert(!completed.revealedNotebookEntries.has(oppositeNote));
    });
  }
});

// Existing BAD01 tests cover five contiguous D1-D4 prefixes. Noncontiguous
// holdings must not skip an earlier missing deduction in favor of a later one.
describe('full QA: synthetic noncontiguous BAD01 review boundaries', () => {
  const deductionIds = ['D1', 'D2', 'D3', 'D4'];
  const coveredPrefixes = new Set([0, 1, 3, 7, 15]);
  for (let mask = 0; mask < 16; mask += 1) {
    if (coveredPrefixes.has(mask)) continue;
    const held = deductionIds.filter((_, bit) => mask & (1 << bit));
    it(`D1-D4 mask ${mask}: reveals the earliest missing deduction without repairing it`, () => {
      const initial = createInitialState({
        runId: 'RUN_NONCONTIGUOUS_BAD01', sceneId: 'END_BAD01', seed: 917,
        characterIds: GAME_CONTENT.characters.map(character => character.id),
        flags: { FLAG_OUTCOME: 'BAD01', FLAG_FINAL_CHOICE: 'A' },
      });
      const base = gameReducer({ ...initial, deductions: new Set(held) }, { type: 'begin' });
      let state = base;
      while (state.blockId !== 'BLK_END_BAD01_REVIEW') {
        assert.notEqual(state.displayStage, 'complete');
        state = advance(state);
      }
      const missing = deductionIds.find(id => !held.includes(id))!;
      assert.equal(state.resolvedVariantId, `VAR_END_BAD01_MISSING_${missing}`);
      state = advance(deserializeGameState(serializeGameState(state)));
      assert.deepEqual(
        [...state.revealedNotebookEntries].filter(id => /^NOTE_END_BAD01_(?:MISSING_D|CONNECTION_FAILED)/.test(id)),
        [`NOTE_END_BAD01_MISSING_${missing}`],
      );
      const completed = finishEnding(state);
      assert.deepEqual(sorted(completed.deductions), held);
      assert.deepEqual(completed.evidence, base.evidence);
    });
  }
});

// Source 1794-1800 requires the first missing review, not a cumulative repair.
// Each walk starts at CH01 and changes exactly one earlier source decision.
describe('full QA: real-choice walks for every BAD01 review', () => {
  for (const [original, replacement, variant, missingDeduction] of [
    ['C12_A', 'C12_B', 'MISSING_D1', 'D1'],
    ['C16_A', 'C16_B', 'MISSING_D2', 'D2'],
    ['C17_A', 'C17_B', 'MISSING_D3', 'D3'],
    ['C18_A', 'C18_B', 'MISSING_D4', 'D4'],
    ['C20_A', 'C20_B', 'CONNECTION_FAILED', 'D5'],
  ] as const) {
    it(`${replacement}: actual route discloses only ${variant} and never repairs proof`, () => {
      let state = play(TRUE_WITNESS.map(id => id === original ? replacement : id));
      assert.equal(state.sceneId, 'END_BAD01');
      assert(!state.deductions.has(missingDeduction));
      const evidence = sorted(state.evidence);
      const deductions = sorted(state.deductions);
      while (state.blockId !== 'BLK_END_BAD01_REVIEW') {
        assert.notEqual(state.displayStage, 'complete');
        state = advance(state);
        assert.deepEqual(sorted(state.evidence), evidence);
        assert.deepEqual(sorted(state.deductions), deductions);
      }
      assert.equal(state.resolvedVariantId, `VAR_END_BAD01_${variant}`);
      state = advance(deserializeGameState(serializeGameState(state)));
      assert.deepEqual(
        [...state.revealedNotebookEntries].filter(id => /^NOTE_END_BAD01_(?:MISSING_D|CONNECTION_FAILED)/.test(id)),
        [`NOTE_END_BAD01_${variant}`],
      );
      const completed = finishEnding(state);
      assert.deepEqual(sorted(completed.evidence), evidence);
      assert.deepEqual(sorted(completed.deductions), deductions);
    });
  }
});
