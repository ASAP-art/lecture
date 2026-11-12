import { describe, expect, it } from 'vitest';
import { resolveStageVisual } from '../src/engine/visuals';
import { resolveStageIllustration } from '../src/engine/illustrations';
import { deserializeGameState, serializeGameState, type RuntimeGameState } from '../src/engine/state';
import { advance, beginAt, select, toBoundary } from './helpers/engine-walk';
import { advanceSession, prefixSession, selectSession } from './helpers/save-play';
import type { SaveSession } from '../src/engine/save-session';

function atBlock(state: RuntimeGameState, blockId: string): RuntimeGameState {
  for (let step = 0; step < 100; step += 1) {
    if (state.blockId === blockId) return state;
    state = advance(state);
  }
  throw new Error(`Block not reached: ${blockId}`);
}
function atSessionBlock(session: SaveSession, blockId: string): SaveSession {
  for (let step = 0; step < 100; step += 1) {
    if (session.game.blockId === blockId) return session;
    session = advanceSession(session);
  }
  throw new Error(`Session block not reached: ${blockId}`);
}
const ids = (state: RuntimeGameState) => resolveStageVisual(state).portraits.map(p => p.asset?.id);

describe('current dialogue portrait actions', () => {
  it('changes at the actual action, returns to neutral, and keeps live co-present people without changing game state', () => {
    let state = atBlock(beginAt('CH01_S02'), 'BLK_CH01_S02_05');
    expect(ids(state)).toEqual(['char_yikyung_neutral']);
    state = advance(state);
    const saved = serializeGameState(state);
    const visual = resolveStageVisual(state, '/lecture/last-check/');
    expect(visual.portraits.map(p => p.asset?.id)).toEqual(['char_yikyung_looking_at_key']);
    expect(visual.portraits[0]?.neutralAsset?.id).toBe('char_yikyung_neutral');
    expect(visual.portraits[0]?.url).toBe('/lecture/last-check/assets/char_yikyung_looking_at_key.png?v=068ed99e463e');
    expect(resolveStageVisual(deserializeGameState(saved), '/lecture/last-check/')).toEqual(visual);
    expect(serializeGameState(state)).toBe(saved);
    expect(ids({ ...state, revealedBlocks: new Set() })).toEqual(['char_yikyung_neutral']);
    state = advance(state);
    expect(ids(state)).toEqual(['char_yikyung_neutral']);
    state = advance(state);
    expect(ids(state)).toEqual(['char_yikyung_neutral', 'char_dohyun_sliding_casefile']);
    expect(ids(advance(state))).toEqual([]);
  });

  it('stages the live blueprint explanation in the existing interview setting, never as a person inside the machine-room reference', () => {
    const before = atBlock(beginAt('CH02_S02'), 'BLK_CH02_S02_08');
    expect(resolveStageVisual(before).backgroundMode).toBe('reference');
    expect(ids(before)).toEqual([]);
    const action = advance(before);
    const visual = resolveStageVisual(action);
    expect(visual.background.asset?.id).toBe('bg_interview');
    expect(visual.backgroundMode).toBe('location');
    expect(ids(action)).toEqual(['char_junseok_pointing_blueprint']);
    expect(ids(advance(action))).toEqual(['char_junseok_pointing_blueprint']);
    const after = advance(advance(action));
    expect(resolveStageVisual(after).backgroundMode).toBe('reference');
    expect(ids(after)).toEqual([]);
  });

  it('does not turn the CCTV witness or recorded voices into live action portraits', () => {
    let state = atBlock(beginAt('CH03_S01'), 'BLK_CH03_S01_01');
    expect(ids(state)).toEqual([]);
    state = atBlock(beginAt('CH06_S01'), 'BLK_CH06_S01_07');
    expect(ids(state)).toEqual([]);
    state = atBlock(state, 'BLK_CH06_S01_12');
    expect(ids(state)).toContain('char_jihoo_staring_document');
    expect(ids(advance(state))).toEqual(['char_jihu_neutral']);
  });

  it('keeps a confirmed complete pose through restore without recalculating the branch from later evidence', () => {
    const selected = selectSession(prefixSession(19), 'C20_A').game;
    expect(selected.resolvedVariants.BLK_CH08_S03_A_RESULT).toBe('VAR_CH08_S03_A_COMPLETE');
    expect(ids(selected)).toContain('char_yikyung_gripping_armrest');
    const changed = { ...selected, evidence: new Set<string>(), deductions: new Set<string>() };
    expect(ids(deserializeGameState(serializeGameState(changed)))).toContain('char_yikyung_gripping_armrest');
    const incomplete = select(toBoundary(beginAt('CH08_S03')), 'C20_A');
    expect(incomplete.resolvedVariants.BLK_CH08_S03_A_RESULT).toBe('VAR_CH08_S03_A_INCOMPLETE');
    expect(ids(incomplete)).not.toContain('char_yikyung_gripping_armrest');
    expect(ids(advance(selected))).not.toContain('char_yikyung_gripping_armrest');
  });

  it('requires actual notebook extraction on the selected path, then preserves document-CG priority', () => {
    const selected = selectSession(selectSession(prefixSession(20), 'C21_A'), 'C22_A');
    const before = atSessionBlock(selected, 'BLK_CH09_S02_A_04');
    expect(ids(before.game)).not.toContain('char_yikyung_open_notebook');
    const opened = advanceSession(before);
    expect(opened.game.blockId).toBe('BLK_CH09_S02_A_05');
    expect(ids(opened.game)).toContain('char_yikyung_open_notebook');
    expect(resolveStageIllustration(opened.game)).toBeNull();
    expect(ids({ ...opened.game, revealedBlocks: new Set() })).not.toContain('char_yikyung_open_notebook');
    expect(ids({ ...opened.game, choiceHistory: [] })).toEqual([]);
    expect(ids(deserializeGameState(serializeGameState(opened.game)))).toContain('char_yikyung_open_notebook');
    const disclosed = advanceSession(opened);
    expect(resolveStageIllustration(disclosed.game)?.asset.id).toBe('cg_notebook');
    expect(ids(disclosed.game)).not.toContain('char_yikyung_open_notebook');
    let otherPath = selectSession(selectSession(prefixSession(20), 'C21_B'), 'C22_B');
    while (otherPath.game.sceneId === 'CH09_S02_B') {
      expect(ids(otherPath.game)).not.toContain('char_yikyung_open_notebook');
      otherPath = advanceSession(otherPath);
    }
  });
});
