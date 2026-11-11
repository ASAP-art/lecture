import { describe, expect, it } from 'vitest';
import { resolveStageIllustration, upcomingIllustrationUrl } from '../src/engine/illustrations';
import { deserializeGameState, serializeGameState } from '../src/engine/state';
import type { SaveSession } from '../src/engine/save-session';
import { advanceSession, freshSession, prefixSession, selectSession } from './helpers/save-play';

const base = '/lecture/last-check/';
function atBlock(session: SaveSession, id: string): SaveSession {
  for (let step = 0; step < 100; step += 1) {
    if (session.game.blockId === id) return session;
    session = advanceSession(session);
  }
  throw new Error(`Block not reached: ${id}`);
}
const letter = () => selectSession(prefixSession(20), 'C21_A');
const notebook = () => selectSession(letter(), 'C22_A');

describe('illustration disclosure and bounded preloading', () => {
  it.each([
    ['doc_seal_envelope', () => prefixSession(0), 'BLK_CH01_S01_08'],
    ['cg_cctv_safety', () => prefixSession(4), 'BLK_CH03_S01_01'],
    ['cg_letter', letter, 'BLK_CH09_S01_A_02'],
    ['cg_notebook', notebook, 'BLK_CH09_S02_A_05'],
  ] as const)('%s waits for its actual completed disclosure block, including restore', (assetId, start, blockId) => {
    let session = start();
    while (session.game.blockId !== blockId) {
      expect(resolveStageIllustration(session.game, base)).toBeNull();
      expect(upcomingIllustrationUrl(session.game, base)).toBeNull();
      session = advanceSession(session);
    }
    expect(resolveStageIllustration(session.game, base)).toBeNull();
    expect(upcomingIllustrationUrl(session.game, base)).toMatch(/^\/lecture\/last-check\/assets\//);
    session = advanceSession(session);
    const before = serializeGameState(session.game);
    const cut = resolveStageIllustration(session.game, base);
    expect(cut?.asset.id).toBe(assetId);
    expect(resolveStageIllustration(deserializeGameState(before), base)).toEqual(cut);
    expect(upcomingIllustrationUrl(session.game, base)).toBeNull();
    expect(serializeGameState(session.game)).toBe(before);
  });

  it.each(['C21_A', 'C21_B'])('keeps letter/notebook independent across %s and both C22 paths', (c21) => {
    for (const c22 of ['C22_A', 'C22_B']) {
      let session = selectSession(selectSession(prefixSession(20), c21), c22);
      while (session.game.blockId) {
        const cut = resolveStageIllustration(session.game, base);
        expect(cut?.asset.id).not.toBe('cg_letter');
        if (c22 === 'C22_B') {
          expect(cut).toBeNull();
          expect(upcomingIllustrationUrl(session.game, base)).toBeNull();
        }
        session = advanceSession(session);
      }
    }
  });

  it('does not authorize a private cut from possession, scene entry or an unselected result', () => {
    const atEntry = letter().game;
    expect(atEntry.evidence.has('E14')).toBe(true);
    expect(resolveStageIllustration(atEntry, base)).toBeNull();
    const disclosed = advanceSession(atBlock(letter(), 'BLK_CH09_S01_A_02')).game;
    expect(resolveStageIllustration({ ...disclosed, revealedEvidenceSections: new Set() }, base)).toBeNull();
    expect(resolveStageIllustration({ ...disclosed, choiceHistory: [] }, base)).toBeNull();
    expect(upcomingIllustrationUrl({ ...atEntry, choiceHistory: [], blockId: 'BLK_CH09_S01_A_02' }, base)).toBeNull();
    const notebookEntry = notebook().game;
    expect(notebookEntry.evidence.has('E16')).toBe(true);
    expect(resolveStageIllustration(notebookEntry, base)).toBeNull();
  });

  it('shows the title only on the initial title screen and drops the previous cut on scene change', () => {
    expect(resolveStageIllustration(freshSession().game, base)?.asset.id).toBe('title_main');
    const envelope = advanceSession(atBlock(prefixSession(0), 'BLK_CH01_S01_08'));
    expect(resolveStageIllustration(envelope.game, base)?.asset.id).toBe('doc_seal_envelope');
    const next = atBlock(selectSession(envelope, 'C01_B'), 'BLK_CH01_S02_01');
    expect(resolveStageIllustration(next.game, base)).toBeNull();
    expect(upcomingIllustrationUrl(next.game, base)).toBeNull();
  });
});
