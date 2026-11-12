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
    expect(resolveStageVisual(beginAt('CH01_S02_A')).portraits).toEqual([]);
    const missing = resolveStageVisual(beginAt('CH03_S01'));
    expect(missing.portraits).toEqual([]);
  });

  it('applies before on the active block and after only once the block is completed', () => {
    let state = beginAt('CH01_S02');
    while (state.blockId !== 'BLK_CH01_S02_09') state = advance(state);
    expect(resolveStageVisual(state).portraits).toEqual([]);
    state = advance(state);
    expect(state.blockId).toBe('BLK_CH01_S02_10');
    expect(resolveStageVisual(state).portraits).toEqual([]);
    state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual(['char_yikyung_neutral']);
  });

  it('keeps the confirmed result visual across later evidence changes and save restoration without mutation', () => {
    const selected = select(toBoundary(beginAt('CH07_S03')), 'C17_A');
    const changed = { ...selected, evidence: new Set(['E04', 'E06']) };
    const before = serializeGameState(changed);
    const visual = resolveStageVisual(changed, '/lecture/last-check/');
    expect(visual.portraits.map(p => p.requestedId)).toEqual(['char_dohyeon_neutral']);
    expect(visual.backgroundUrl).toBe('/lecture/last-check/assets/bg_interview.png');
    expect(resolveStageVisual(deserializeGameState(before), '/lecture/last-check/')).toEqual(visual);
    expect(serializeGameState(changed)).toBe(before);
  });

  it('uses the selected result base without inheriting unrelated parent block events', () => {
    const selected = select(toBoundary(beginAt('CH01_S02')), 'C02_A');
    expect(resolveStageVisual(selected).portraits.map(p => p.requestedId)).toEqual(['char_yikyung_neutral']);
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
    expect(visual.portraits).toEqual([]);
    expect(resolveStageVisual(deserializeGameState(before))).toEqual(visual);
    expect(serializeGameState(analysis)).toBe(before);
    expect(resolveStageVisual(beginAt('CH06_S02')).backgroundMode).toBe('location');
    expect(resolveStageVisual(beginAt('CH09_S01')).background.asset?.id).toBe('bg_corridor');
    const interview = resolveStageVisual(select(toBoundary(beginAt('CH06_S02')), 'C14_C'));
    expect(interview.background.asset?.id).toBe('bg_interview');
    expect(interview.backgroundCaption).toBeNull();
    expect(interview.portraits.map(p => p.asset?.id)).toEqual(['char_yikyung_neutral']);
  });

  it('waits for a live introduction and never stages recorded voices as on-site speakers', () => {
    let state = beginAt('CH06_S01');
    expect(resolveStageVisual(state).portraits).toEqual([]);
    while (state.blockId !== 'BLK_CH06_S01_07') state = advance(state);
    expect(resolveStageVisual(state).portraits).toEqual([]);
    while (state.blockId !== 'BLK_CH06_S01_13') state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.asset?.id)).toEqual(['char_jihu_neutral']);
    expect(resolveStageVisual({
      ...state, blockId: 'BLK_CH06_S01_07', blockCursor: 6,
    }).portraits).toEqual([]);
  });

  it('hides playback portraits even after the live witness was disclosed, then restores only the present witness', () => {
    let state = select(toBoundary(beginAt('CH06_S02')), 'C14_A');
    const before = serializeGameState(state);
    expect(resolveStageVisual(state).portraits).toEqual([]);
    expect(serializeGameState(state)).toBe(before);
    state = advance(state);
    expect(resolveStageVisual(state).portraits).toEqual([]);
    while (state.blockId !== 'BLK_CH06_S02_A_04') state = advance(state);
    const visual = resolveStageVisual(state);
    expect(visual.portraits.map(p => p.asset?.id)).toEqual(['char_suhyeon_neutral']);
    expect(resolveStageVisual(deserializeGameState(serializeGameState(state)))).toEqual(visual);
  });

  it('publishes only live co-present witnesses, not names read from a roster or future dialogue', () => {
    let state = beginAt('CH03_S02');
    while (state.blockId !== 'BLK_CH03_S02_03') state = advance(state);
    expect(resolveStageVisual(state).portraits).toEqual([]);
    while (state.blockId !== 'BLK_CH03_S02_05') state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual(['char_suhyeon_neutral']);
    state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual([
      'char_suhyeon_neutral', 'char_jihu_neutral',
    ]);
    while (state.blockId !== 'BLK_CH03_S02_09') state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual([
      'char_suhyeon_neutral', 'char_jihu_neutral',
    ]);
    state = advance(state);
    const before = serializeGameState(state);
    const visual = resolveStageVisual(state, '/lecture/last-check/');
    expect(visual.portraits.map(p => p.requestedId)).toEqual([
      'char_suhyeon_neutral', 'char_jihu_neutral', 'char_eunseo_neutral',
    ]);
    expect(visual.portraits.every(p => p.url?.startsWith('/lecture/last-check/assets/'))).toBe(true);
    expect(resolveStageVisual(deserializeGameState(before), '/lecture/last-check/')).toEqual(visual);
    expect(serializeGameState(state)).toBe(before);
  });

  it('resets groups at selected-result and next-scene boundaries without inheriting parent block cues', () => {
    let state = select(toBoundary(beginAt('CH03_S02')), 'C06_B');
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual(['char_junseok_neutral']);
    while (state.blockId !== 'BLK_CH03_S02_B_04') state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual([
      'char_junseok_neutral', 'char_jihu_neutral',
    ]);
    expect(resolveStageVisual({ ...state, sceneId: 'CH03_S02_C' }).portraits).toEqual([]);
    expect(resolveStageVisual(beginAt('CH03_S03')).portraits).toEqual([]);
  });

  it.each([
    ['C15_A', 'BLK_CH07_S01_A_04'],
    ['C15_B', 'BLK_CH07_S01_B_02'],
  ] as const)('groups the two live analysts only at the selected %s discussion', (choice, block) => {
    let state = select(toBoundary(beginAt('CH07_S01')), choice);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual(['char_junseok_neutral']);
    while (state.blockId !== block) state = advance(state);
    expect(resolveStageVisual(state).portraits.map(p => p.requestedId)).toEqual([
      'char_junseok_neutral', 'char_dohyeon_neutral',
    ]);
  });
});
