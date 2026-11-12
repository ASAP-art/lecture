import { describe, expect, it } from 'vitest';
import { GAME_INDEX } from '../src/content/game-content';
import { blockText } from '../src/engine/gameplay';
import { deserializeGameState, serializeGameState, type RuntimeGameState } from '../src/engine/state';
import { applyEffectDefinition } from '../src/engine/transition';
import { getDialogueReviewEntries } from '../src/ui/dialogue-review';
import { advance, beginAt, choiceState, finishResult, select, toBoundary } from './helpers/engine-walk';

describe('current decision interval dialogue review', () => {
  it('exposes only completed blocks before a choice, never the active or future block', () => {
    const started = beginAt();
    expect(getDialogueReviewEntries(started)).toEqual([]);
    const state = advance(started);
    const first = GAME_INDEX.scenes.get('CH01_S01')!.blocks[0]!;
    expect(getDialogueReviewEntries(state)).toEqual([{
      id: state.displayLog[0]!.id,
      sceneId: 'CH01_S01',
      blockId: first.id,
      kind: first.kind,
      text: blockText(first, state),
    }]);
    expect(state.blockId).not.toBe(first.id);
  });

  it('keeps the completed common scene available while its choice is pending', () => {
    const state = choiceState('CH01_S01');
    const entries = getDialogueReviewEntries(state);
    expect(entries.map((entry) => entry.blockId)).toEqual(
      GAME_INDEX.scenes.get('CH01_S01')!.blocks.map((block) => block.id),
    );
  });

  it('closes the previous interval immediately and irreversibly on selection', () => {
    const pending = choiceState('CH01_S01');
    const selected = select(pending, 'C01_A');
    expect(getDialogueReviewEntries(selected)).toEqual([]);
    const completed = advance(selected);
    expect(getDialogueReviewEntries(completed).map((entry) => entry.blockId)).toEqual([
      'BLK_CH01_S01_A_01',
    ]);
  });

  it('retains the result and subsequent common scene in order until the next selection', () => {
    const selected = select(choiceState('CH01_S01'), 'C01_A');
    const common = finishResult(selected);
    expect(common.sceneId).toBe('CH01_S02');
    const resultIds = GAME_INDEX.scenes.get('CH01_S01_A')!.blocks.map((block) => block.id);
    expect(getDialogueReviewEntries(common).map((entry) => entry.blockId)).toEqual(resultIds);
    const pending = toBoundary(common);
    expect(getDialogueReviewEntries(pending).map((entry) => entry.blockId)).toEqual([
      ...resultIds,
      ...GAME_INDEX.scenes.get('CH01_S02')!.blocks.map((block) => block.id),
    ]);
    expect(getDialogueReviewEntries(select(pending, 'C02_A'))).toEqual([]);
  });

  it('keeps the saved conditional text despite holdings changing after resolution', () => {
    const selected = select(choiceState('CH07_S02'), 'C16_A');
    const completed = advance(selected);
    const changed = applyEffectDefinition(completed, GAME_INDEX.effects.get('FX_C15_A')!);
    expect(completed.evidence.has('E07')).toBe(false);
    expect(changed.evidence.has('E07')).toBe(true);
    expect(changed.resolvedVariants.BLK_CH07_S02_A_RESULT).toBe('VAR_CH07_S02_A_MISSING_E07');
    const entries = getDialogueReviewEntries(changed);
    expect(entries.map(entry => entry.blockId)).toEqual(['BLK_CH07_S02_A_RESULT']);
    expect(entries[0]!.text).toBe(
      '도현: “그 순서를 확정하려면 독립 이력이 필요합니다. 지금은 후보 시간표예요.”\n\n서진: “현재 상태를 과거의 원인으로 바로 쓸 수 없다는 것까지만 적어.”',
    );
    expect(entries).toEqual(getDialogueReviewEntries(completed));
  });

  it('preserves the interval across serialization and never mutates the save', () => {
    const state = toBoundary(finishResult(select(choiceState('CH01_S01'), 'C01_A')));
    const before = serializeGameState(state);
    const entries = getDialogueReviewEntries(state);
    expect(serializeGameState(state)).toBe(before);
    const restored = deserializeGameState(before);
    expect(getDialogueReviewEntries(restored)).toEqual(entries);
    expect(serializeGameState(restored)).toBe(before);

    const conditional = advance(select(choiceState('CH07_S02'), 'C16_A'));
    const conditionalSave = serializeGameState(conditional);
    expect(getDialogueReviewEntries(deserializeGameState(conditionalSave))).toEqual(
      getDialogueReviewEntries(conditional),
    );
    expect(serializeGameState(conditional)).toBe(conditionalSave);
  });

  it('excludes logs exactly on the choice revision boundary (injected boundary state)', () => {
    const pending = choiceState('CH01_S01');
    const selected = advance(select(pending, 'C01_A'));
    const state: RuntimeGameState = {
      ...selected,
      displayLog: [
        { ...pending.displayLog[0]!, revision: selected.choiceHistory.at(-1)!.revision },
        selected.displayLog.at(-1)!,
      ],
    };
    expect(getDialogueReviewEntries(state).map((entry) => entry.blockId)).toEqual(['BLK_CH01_S01_A_01']);
  });

  it('excludes unknown, mismatched, null and unrevealed blocks (injected boundary states)', () => {
    const state = advance(beginAt());
    const log = state.displayLog[0]!;
    const malformed: RuntimeGameState = {
      ...state,
      displayLog: [
        { ...log, sceneId: 'CH99_S99' },
        { ...log, sceneId: 'CH01_S02' },
        { ...log, blockId: 'BLK_UNKNOWN' },
        { ...log, blockId: null },
        { ...log, blockId: state.blockId },
      ],
    };
    expect(getDialogueReviewEntries(malformed)).toEqual([]);
    expect(getDialogueReviewEntries({ ...state, revealedBlocks: new Set() })).toEqual([]);
  });

  it('excludes missing or invalid saved conditional resolutions (injected boundary states)', () => {
    const state = advance(select(choiceState('CH07_S02'), 'C16_A'));
    expect(getDialogueReviewEntries(state).map(entry => entry.blockId)).toEqual(['BLK_CH07_S02_A_RESULT']);
    expect(getDialogueReviewEntries({ ...state, resolvedVariants: {} })).toEqual([]);
    expect(getDialogueReviewEntries({
      ...state,
      resolvedVariants: { ...state.resolvedVariants, BLK_CH07_S02_A_RESULT: 'VAR_UNKNOWN' },
    })).toEqual([]);
  });
});
