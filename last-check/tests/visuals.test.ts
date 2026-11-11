import { describe, expect, it } from 'vitest';
import { GAME_INDEX } from '../src/content/game-content';
import { resolveStageVisual, SCENE_VISUAL_MAPPINGS } from '../src/engine/visuals';
import { deserializeGameState, serializeGameState } from '../src/engine/state';
import { beginAt, advance, toBoundary, select } from './helpers/engine-walk';
import { freshSession } from './helpers/save-play';

describe('stage art disclosure', () => {
  it('covers all scenes and only references blocks in their own scene and registered variants', () => {
    expect(Object.keys(SCENE_VISUAL_MAPPINGS).sort()).toEqual([...GAME_INDEX.scenes.keys()].sort());
    for (const mapping of Object.values(SCENE_VISUAL_MAPPINGS)) {
      const scene = GAME_INDEX.scenes.get(mapping.sceneId)!;
      if (mapping.inheritsFrom) expect(GAME_INDEX.scenes.get(mapping.inheritsFrom)?.choices.some(c => c.resultSceneId === scene.id)).toBe(true);
      for (const override of mapping.blockOverrides) {
        const target = scene.blocks.find(b => b.id === override.blockId);
        expect(target, override.blockId).toBeDefined();
        if (override.variantId) expect(target?.content.type === 'conditional' && target.content.variants.some(v => v.id === override.variantId)).toBe(true);
      }
    }
  });

  it('hides title art and unselected result scenes; missing portraits do not reuse previous art', () => {
    expect(resolveStageVisual(freshSession().game).background.asset).toBeNull();
    expect(resolveStageVisual(beginAt('CH01_S01')).backgroundUrl).toBe('/assets/bg_archive.png');
    expect(resolveStageVisual(beginAt('CH01_S02_A')).portrait.asset).toBeNull();
    const missing = resolveStageVisual(beginAt('CH03_S01'));
    expect(missing.portrait.asset).toBeNull();
  });

  it('applies before on the active block and after only once the block is completed', () => {
    let state = beginAt('CH01_S02');
    while (state.blockId !== 'BLK_CH01_S02_09') state = advance(state);
    expect(resolveStageVisual(state).portrait.asset).toBeNull();
    state = advance(state);
    expect(state.blockId).toBe('BLK_CH01_S02_10');
    expect(resolveStageVisual(state).portrait.asset).toBeNull();
    state = advance(state);
    expect(resolveStageVisual(state).portrait.requestedId).toBe('char_yikyung_neutral');
  });

  it('keeps the confirmed result visual across later evidence changes and save restoration without mutation', () => {
    const selected = select(toBoundary(beginAt('CH07_S03')), 'C17_A');
    const changed = { ...selected, evidence: new Set(['E04', 'E06']) };
    const before = serializeGameState(changed);
    const visual = resolveStageVisual(changed, '/lecture/last-check/');
    expect(visual.portrait.requestedId).toBe('char_dohyeon_neutral');
    expect(visual.backgroundUrl).toBe('/lecture/last-check/assets/bg_interview.png');
    expect(resolveStageVisual(deserializeGameState(before), '/lecture/last-check/')).toEqual(visual);
    expect(serializeGameState(changed)).toBe(before);
  });

  it('uses the selected result base without inheriting unrelated parent block events', () => {
    const selected = select(toBoundary(beginAt('CH01_S02')), 'C02_A');
    expect(resolveStageVisual(selected).portrait.requestedId).toBe('char_yikyung_neutral');
    expect(resolveStageVisual({ ...selected, sceneId: 'CH01_S02_B' }).background.asset).toBeNull();
  });

  it('distinguishes illustrative spaces from actual locations, including selected result inheritance', () => {
    const machine = resolveStageVisual(beginAt('CH02_S02'), '/lecture/last-check/');
    expect(machine.backgroundMode).toBe('reference');
    expect(machine.background.asset?.fit).toBe('contain');
    const safety = resolveStageVisual(beginAt('CH03_S01'));
    expect(safety.backgroundMode).toBe('reference');
    const analysis = select(toBoundary(beginAt('CH07_S02')), 'C16_A');
    const before = serializeGameState(analysis);
    const visual = resolveStageVisual(analysis);
    expect(visual.backgroundMode).toBe('reference');
    expect(visual.portrait.asset).toBeNull();
    expect(resolveStageVisual(deserializeGameState(before))).toEqual(visual);
    expect(serializeGameState(analysis)).toBe(before);
    expect(resolveStageVisual(beginAt('CH06_S02')).backgroundMode).toBe('location');
    expect(resolveStageVisual(beginAt('CH09_S01')).background.asset?.id).toBe('bg_corridor');
    const interview = resolveStageVisual(select(toBoundary(beginAt('CH06_S02')), 'C14_C'));
    expect(interview.background.asset?.id).toBe('bg_interview');
    expect(interview.backgroundCaption).toBeNull();
    expect(interview.portrait.asset?.id).toBe('char_yikyung_neutral');
  });

  it('waits for a live introduction and never stages recorded voices as on-site speakers', () => {
    let state = beginAt('CH06_S01');
    expect(resolveStageVisual(state).portrait.asset).toBeNull();
    while (state.blockId !== 'BLK_CH06_S01_07') state = advance(state);
    expect(resolveStageVisual(state).portrait.asset).toBeNull();
    while (state.blockId !== 'BLK_CH06_S01_13') state = advance(state);
    expect(resolveStageVisual(state).portrait.asset?.id).toBe('char_jihu_neutral');
    expect(resolveStageVisual({
      ...state, blockId: 'BLK_CH06_S01_07', blockCursor: 6,
    }).portrait.asset).toBeNull();
  });

  it('hides playback portraits even after the live witness was disclosed, then restores only the present witness', () => {
    let state = select(toBoundary(beginAt('CH06_S02')), 'C14_A');
    const before = serializeGameState(state);
    expect(resolveStageVisual(state).portrait.asset).toBeNull();
    expect(serializeGameState(state)).toBe(before);
    state = advance(state);
    expect(resolveStageVisual(state).portrait.asset).toBeNull();
    while (state.blockId !== 'BLK_CH06_S02_A_04') state = advance(state);
    const visual = resolveStageVisual(state);
    expect(visual.portrait.asset?.id).toBe('char_suhyeon_neutral');
    expect(resolveStageVisual(deserializeGameState(serializeGameState(state)))).toEqual(visual);
  });
});
