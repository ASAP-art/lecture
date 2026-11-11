import { describe, expect, it } from 'vitest';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import type { ChoiceId } from '../src/content/ids';
import { blockText, currentBlock } from '../src/engine/gameplay';
import { gameReducer } from '../src/engine/reducer';
import {
  createInitialState,
  deserializeGameState,
  serializeGameState,
  type RuntimeGameState,
} from '../src/engine/state';

const characterIds = GAME_CONTENT.characters.map((character) => character.id);

function initial(): RuntimeGameState {
  return createInitialState({
    runId: 'RUN_CH01_TEST',
    sceneId: 'CH01_S01',
    seed: 734,
    characterIds,
  });
}

function begin(): RuntimeGameState {
  return gameReducer(initial(), { type: 'begin' });
}

function continueBlocks(state: RuntimeGameState, count: number): RuntimeGameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = gameReducer(next, { type: 'continueBlock' });
  }
  return next;
}

function reachChoice(state: RuntimeGameState): RuntimeGameState {
  const scene = GAME_INDEX.scenes.get(state.sceneId)!;
  return continueBlocks(state, scene.blocks.length - state.blockCursor);
}

function choose(state: RuntimeGameState, choiceId: ChoiceId): RuntimeGameState {
  return gameReducer(state, { type: 'choose', choiceId });
}

describe('CH01 gameplay', () => {
  it('acquires E01 logically at start but hides its notebook text until its source block completes', () => {
    const started = begin();
    expect(started.evidence.has('E01')).toBe(true);
    expect(started.revealedEvidenceSections.size).toBe(0);

    const beforeSourceBlockCompletes = continueBlocks(started, 4);
    expect(beforeSourceBlockCompletes.blockId).toBe('BLK_CH01_S01_05');
    expect(beforeSourceBlockCompletes.revealedEvidenceSections.size).toBe(0);

    const afterSourceBlockCompletes = continueBlocks(beforeSourceBlockCompletes, 1);
    expect(afterSourceBlockCompletes.revealedEvidenceSections.has('ESECTION_E01_RECORD')).toBe(true);
  });

  it('enforces current scene, allowed choice, and unresolved choice before entering its result', () => {
    const started = begin();
    expect(() => choose(started, 'C01_A')).toThrow('현재 단계에서는 선택 불가');

    const atChoice = reachChoice(started);
    expect(atChoice.displayStage).toBe('choice');
    expect(() => choose(atChoice, 'C02_A')).toThrow('현재 scene에서 허용되지 않은 choice ID');

    const result = choose(atChoice, 'C01_A');
    expect(result.sceneId).toBe('CH01_S01_A');
    expect(blockText(currentBlock(result, GAME_INDEX)!, result)).toBe(
      '수현: “제가 출력되고 바로 넣었어요. 이 줄이 사건번호고, 여기 제 서명이에요.”',
    );
    expect(() => choose(result, 'C01_B')).toThrow('현재 단계에서는 선택 불가');
  });

  it('applies C01_A once, reveals E02 after the full result, then follows original next', () => {
    const result = choose(reachChoice(begin()), 'C01_A');
    expect(result.evidence.has('E02')).toBe(true);
    expect(result.flags.FLAG_ENVELOPE).toBe(true);
    expect(result.relations.CHAR_SUHYEON).toEqual({ trust: 1, suspicion: 0 });
    expect(result.revealedEvidenceSections.has('ESECTION_E02_ENVELOPE')).toBe(false);

    const beforeLastResultBlock = continueBlocks(result, 4);
    expect(beforeLastResultBlock.blockId).toBe('BLK_CH01_S01_A_05');
    expect(beforeLastResultBlock.revealedEvidenceSections.has('ESECTION_E02_ENVELOPE')).toBe(false);

    const nextScene = continueBlocks(beforeLastResultBlock, 1);
    expect(nextScene.sceneId).toBe('CH01_S02');
    expect(nextScene.relations.CHAR_SUHYEON?.trust).toBe(1);
    expect(nextScene.revealedEvidenceSections.has('ESECTION_E02_ENVELOPE')).toBe(true);
    expect([...nextScene.appliedEffects].filter((id) => id === 'FX_C01_A')).toHaveLength(1);
  });

  it('restores the same typing block, cursor, effects, disclosures, and resolved results without skipping', () => {
    const inSecondBlock = continueBlocks(begin(), 1);
    const restored = deserializeGameState(serializeGameState(inSecondBlock));

    expect(restored.sceneId).toBe('CH01_S01');
    expect(restored.blockId).toBe('BLK_CH01_S01_02');
    expect(restored.blockCursor).toBe(1);
    expect(restored.blockDisplay).toBe('typing');
    expect(restored.appliedEffects).toEqual(inSecondBlock.appliedEffects);
    expect(restored.revealedBlocks).toEqual(inSecondBlock.revealedBlocks);
    expect(restored.revealedNotebookEntries).toEqual(inSecondBlock.revealedNotebookEntries);
    expect(restored.resolvedVariants).toEqual(inSecondBlock.resolvedVariants);

    const continued = gameReducer(restored, { type: 'continueBlock' });
    expect(continued.blockId).toBe('BLK_CH01_S01_03');
    expect(continued.evidence.has('E01')).toBe(true);
    expect([...continued.appliedEffects].filter((id) => id === 'FX_CH01_ENTRY_E01')).toHaveLength(1);
  });

  it('ignores a stale repeated UI transition instead of skipping the next block', () => {
    const started = begin();
    const firstBlockId = started.blockId!;
    const advanced = gameReducer(started, { type: 'continueBlock', blockId: firstBlockId });
    const replayed = gameReducer(advanced, { type: 'continueBlock', blockId: firstBlockId });

    expect(advanced.blockId).toBe('BLK_CH01_S01_02');
    expect(replayed).toBe(advanced);
  });

  it.each([
    ['C02_A', 'NOTE_CH01_C02_A_STATEMENT'],
    ['C02_B', 'NOTE_CH01_C02_B_STATEMENT'],
  ] as const)(
    'preserves the %s statement only after its complete result block',
    (choiceId, noteId) => {
      let state = choose(reachChoice(begin()), 'C01_B');
      state = continueBlocks(state, GAME_INDEX.scenes.get(state.sceneId)!.blocks.length);
      state = choose(reachChoice(state), choiceId);

      const resultLength = GAME_INDEX.scenes.get(state.sceneId)!.blocks.length;
      const beforeFinalBlock = continueBlocks(state, resultLength - 1);
      expect(beforeFinalBlock.revealedNotebookEntries.has(noteId)).toBe(false);

      const completed = continueBlocks(beforeFinalBlock, 1);
      expect(completed.revealedNotebookEntries.has(noteId)).toBe(true);
      expect(completed.displayStage).toBe('block');
      expect(completed.sceneId).toBe('CH02_S01');
    },
  );

  it('continues from CH01 into imported CH02 without a filler or blocked boundary', () => {
    let state = choose(reachChoice(begin()), 'C01_B');
    state = reachChoice(continueBlocks(state, GAME_INDEX.scenes.get(state.sceneId)!.blocks.length));
    state = choose(state, 'C02_B');
    state = continueBlocks(state, GAME_INDEX.scenes.get(state.sceneId)!.blocks.length);

    expect(state.displayStage).toBe('block');
    expect(state.sceneId).toBe('CH02_S01');
    expect(state.blockedNextSceneId).toBeNull();
    expect(GAME_INDEX.scenes.has('CH02_S01')).toBe(true);
  });
});
