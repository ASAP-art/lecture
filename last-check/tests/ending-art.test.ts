import { describe, expect, it } from 'vitest';
import { resolveStageIllustration, upcomingIllustrationUrl } from '../src/engine/illustrations';
import { resolveStageVisual } from '../src/engine/visuals';
import { serializeGameState, deserializeGameState } from '../src/engine/state';
import { TRUE_WITNESS } from './fixtures/decision-oracle';
import { advance, beginAt, finishEnding, play, select, toBoundary } from './helpers/engine-walk';

const routes = [
  { scene: 'END_TRUE', asset: 'end_true', block: 'BLK_END_TRUE_71', route: [...TRUE_WITNESS] },
  { scene: 'END_GOOD', asset: 'end_good', block: 'BLK_END_GOOD_31', route: TRUE_WITNESS.map(id => id === 'C11_A' ? 'C11_B' : id === 'C21_A' ? 'C21_B' : id) },
  { scene: 'END_BAD01', asset: 'end_bad01', block: 'BLK_END_BAD01_24', route: TRUE_WITNESS.map(id => id === 'C12_A' ? 'C12_B' : id) },
  { scene: 'END_BAD02', asset: 'end_bad02', block: 'BLK_END_BAD02_37', route: TRUE_WITNESS.map(id => id === 'C09_A' ? 'C09_B' : id === 'C17_A' ? 'C17_B' : id === 'C24_A' ? 'C24_B' : id) },
];
const base = '/lecture/last-check/';

describe('ending art follows the confirmed operating route', () => {
  it.each(routes)('$scene hides future cuts until the last visual block and restores without retroactive E/D', ({ scene, asset, block, route }) => {
    let state = beginAt();
    for (const choice of route) {
      state = toBoundary(state);
      expect(resolveStageIllustration(state, base)?.asset.id.startsWith('end_') ?? false).toBe(false);
      expect(upcomingIllustrationUrl(state, base)?.includes('/end_') ?? false).toBe(false);
      state = select(state, choice);
    }
    state = toBoundary(state);
    expect(state.sceneId).toBe(scene);
    expect(resolveStageIllustration(state, base)).toBeNull();
    const evidence = [...state.evidence];
    const deductions = [...state.deductions];
    for (let count = 0; state.blockId !== block && count < 100; count += 1) {
      expect(resolveStageIllustration(state, base)).toBeNull();
      expect(upcomingIllustrationUrl(state, base)).toBeNull();
      state = advance(state);
    }
    expect(state.blockId).toBe(block);
    const saved = serializeGameState(state);
    const image = resolveStageIllustration(state, base);
    expect(image?.asset.id).toBe(asset);
    expect(image?.url).toMatch(/^\/lecture\/last-check\/assets\/end_/);
    expect(resolveStageIllustration(deserializeGameState(saved), base)).toEqual(image);
    expect(upcomingIllustrationUrl(state, base)).toBeNull();
    expect(serializeGameState(state)).toBe(saved);
    expect(resolveStageIllustration({ ...state, choiceHistory: [] }, base)).toBeNull();
    expect(resolveStageIllustration({ ...state, flags: { ...state.flags, FLAG_OUTCOME: 'UNCONFIRMED' } }, base)).toBeNull();
    state = finishEnding(state);
    expect([...state.evidence]).toEqual(evidence);
    expect([...state.deductions]).toEqual(deductions);
  });

  it('removes BAD01 imagery at blackout and never restores its video cut on the ending card', () => {
    let state = play(routes[2]!.route);
    while (state.blockId !== 'BLK_END_BAD01_24') state = advance(state);
    expect(resolveStageIllustration(state, base)?.asset.id).toBe('end_bad01');
    state = advance(state);
    expect(state.blockId).toBe('BLK_END_BAD01_25');
    for (let count = 0; count < 3; count += 1) {
      expect(resolveStageIllustration(state, base)).toBeNull();
      expect(upcomingIllustrationUrl(state, base)).toBeNull();
      const visual = resolveStageVisual(state, base);
      expect(visual.backgroundUrl).toBeNull();
      expect(visual.portraitUrl).toBeNull();
      state = advance(state);
    }
  });
});
