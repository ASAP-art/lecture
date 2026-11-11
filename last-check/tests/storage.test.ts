import { describe, expect, it } from 'vitest';
import { GAME_INDEX } from '../src/content/game-content';
import { SOURCE_SHA256 } from '../src/content/source';
import { applyEffectDefinition } from '../src/engine/transition';
import { toPersistedGameState } from '../src/engine/state';
import { branchCompletedRun, forkSavedSnapshot, saveSessionReducer } from '../src/engine/save-session';
import { validateSaveDocument, validateSnapshot } from '../src/engine/save-schema';
import { SaveError, SaveRepository, SAVE_KEY, LEGACY_SAVE_KEY, type ExclusiveLocks } from '../src/engine/storage';
import { ENDINGS_KEY, PREFERENCES_KEY, ProfileRepository } from '../src/engine/profile-storage';
import { advanceSession, boundary, completedSession, freshSession, MemoryStorage, prefixSession, selectSession, SerialLocks } from './helpers/save-play';
import { TRUE_WITNESS } from './fixtures/decision-oracle';

const completed = completedSession();
const root = completed.runs[completed.game.runId]!;

describe('consistent slot persistence', () => {
  it('restores the same typing block, seed, effects and disclosure without reapplying rewards', async () => {
    const storage = new MemoryStorage();
    const repo = new SaveRepository(storage, new SerialLocks());
    const selected = selectSession(prefixSession(0), 'C01_A');
    expect(selected.game.evidence.has('E02')).toBe(true);
    expect(selected.game.revealedEvidenceSections.has('ESECTION_E02_ENVELOPE')).toBe(false);
    expect(await repo.saveSession(selected)).toBe(true);
    const restored = new SaveRepository(storage, new SerialLocks()).initialSession(freshSession().game);
    expect(toPersistedGameState(restored.game)).toEqual(toPersistedGameState(selected.game));
    expect(restored.game.evidence).toBeInstanceOf(Set);
    expect(restored.game.blockId).toBe('BLK_CH01_S01_A_01');
    expect(restored.game.seed).toBe(0xffffffff);
    expect(applyEffectDefinition(restored.game, GAME_INDEX.effects.get('FX_C01_A')!)).toBe(restored.game);
    expect(saveSessionReducer(restored, { type:'choose', choiceId:'C01_A', sceneId:'CH01_S01' })).toBe(restored);
    const advanced = advanceSession(restored);
    expect(advanced.game.revealedBlocks.has(restored.game.blockId!)).toBe(true);
    expect(await repo.saveSession(advanced)).toBe(true);
    const again = new SaveRepository(storage, new SerialLocks()).initialSession(freshSession().game);
    expect(again.game.blockId).toBe(advanced.game.blockId);
    expect(again.game.choiceHistory).toEqual(selected.game.choiceHistory);
  });
  it('keeps exactly one auto and three independent manual slots; failed writes never count as success', async () => {
    const storage = new MemoryStorage(); const repo = new SaveRepository(storage, new SerialLocks());
    const first = prefixSession(0), second = advanceSession(first), third = advanceSession(second);
    for (const [i, session] of [first, second, third].entries()) expect(await repo.saveSession(session, i)).toBe(true);
    expect(repo.getView().durable!.manual.map(slot => slot!.state.blockId)).toEqual([first, second, third].map(s => s.game.blockId));
    const before = storage.getItem(SAVE_KEY);
    expect(await repo.saveSession(third, 3)).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(before);
    expect(repo.getView().error).toBe('invalid');
    expect(repo.getView().durable!.auto!.state.blockId).toBe(third.game.blockId);
  });
  it.each(['QuotaExceededError', 'SecurityError'])('keeps progress and pending checkpoint data after %s, then retries', async name => {
    const storage = new MemoryStorage(); const repo = new SaveRepository(storage, new SerialLocks());
    expect(await repo.saveSession(prefixSession(0))).toBe(true);
    const original = storage.getItem(SAVE_KEY);
    const later = boundary(prefixSession(2));
    storage.writeError = name;
    expect(await repo.saveSession(later)).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(original);
    expect(repo.getView().document.auto!.state.sceneId).toBe('CH02_S01');
    expect(repo.getView().document.runs[later.game.runId]!.entries.CH02).toBeDefined();
    expect(repo.getView().error).toBe(name === 'QuotaExceededError' ? 'quota' : 'blocked');
    storage.writeError = null;
    expect(await repo.retry()).toBe(true);
    const restored = new SaveRepository(storage, new SerialLocks()).initialSession(freshSession().game);
    expect(toPersistedGameState(restored.game)).toEqual(toPersistedGameState(later.game));
  });
  it('does not crash or overwrite unreadable storage, and refuses an unsafe lock fallback', async () => {
    const storage = new MemoryStorage(); storage.readError = true;
    const repo = new SaveRepository(storage, new SerialLocks());
    const memory = saveSessionReducer(repo.initialSession(freshSession().game), { type:'begin' });
    expect(await repo.saveSession(memory)).toBe(false);
    expect(memory.game.evidence.has('E01')).toBe(true);
    expect(storage.writes).toBe(0);
    const unlocked: ExclusiveLocks = { async run() { throw new SaveError('blocked'); } };
    storage.readError = false;
    expect(await new SaveRepository(storage, unlocked).saveSession(memory)).toBe(false);
    expect(storage.writes).toBe(0);
  });
  it('keeps an incomplete conditional result frozen across reconnect', async () => {
    let session = selectSession(prefixSession(8), 'C09_B');
    for (const choice of ['C10_A','C11_A','C12_A','C13_A','C14_B','C15_C','C16_A'] as const) session = selectSession(session, choice);
    expect(session.game.evidence.has('E07')).toBe(false);
    expect(session.game.deductions.has('D2')).toBe(false);
    const storage = new MemoryStorage(), repo = new SaveRepository(storage,new SerialLocks());
    expect(await repo.saveSession(session)).toBe(true);
    const restored = new SaveRepository(storage,new SerialLocks()).initialSession(freshSession().game);
    expect(restored.game.resolvedVariantId).toBe(session.game.resolvedVariantId);
    expect(restored.game.resolvedVariants).toEqual(session.game.resolvedVariants);
    expect(restored.game.deductions.has('D2')).toBe(false);
    expect(advanceSession(restored).game.deductions.has('D2')).toBe(false);
  });
  it('keeps in-memory progress and its export when an explicit reload encounters corrupt remote data', async () => {
    const storage = new MemoryStorage(), repo = new SaveRepository(storage,new SerialLocks());
    const session = advanceSession(prefixSession(0));
    await repo.saveSession(session);
    storage.values.set(SAVE_KEY,'remote damaged');
    expect(repo.reloadAutomatic()).toBeNull();
    expect(repo.getView().document.auto!.state.blockId).toBe(session.game.blockId);
    expect(JSON.parse(repo.exportMemory(session)).auto.state.blockId).toBe(session.game.blockId);
    expect(storage.getItem(SAVE_KEY)).toBe('remote damaged');
  });
  it('serializes queued transitions atomically and rejects stale tabs inside an exclusive lock', async () => {
    const storage = new MemoryStorage(), locks = new SerialLocks();
    const first = new SaveRepository(storage, locks), stale = new SaveRepository(storage, locks);
    const s1 = prefixSession(0), s2 = advanceSession(s1);
    const results = await Promise.all([first.saveSession(s1), stale.saveSession(s2)]);
    expect(results).toEqual([true, false]);
    expect(stale.getView().error).toBe('conflict');
    expect(stale.getView().document.auto!.state.blockId).toBe(s2.game.blockId);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).auto.state.blockId).toBe(s1.game.blockId);
    expect(await stale.retry()).toBe(false);
    const remote = stale.reloadAutomatic()!;
    expect(toPersistedGameState(remote.game)).toEqual(toPersistedGameState(s1.game));
    const next = advanceSession(remote);
    expect(await stale.saveSession(next)).toBe(true);
    const r1 = stale.saveSession(advanceSession(next));
    const r2 = stale.saveSession(advanceSession(advanceSession(next)));
    expect(await Promise.all([r1, r2])).toEqual([true, true]);
    expect(stale.getView().durable!.revision).toBe(4);
    expect(stale.getView().pending).toBe(0);
  });
});

describe('original preservation and validation', () => {
  it.each(['not json', '{"version":44}', JSON.stringify({version:1,sourceHash:'another-source'})])('preserves incompatible/corrupt original bytes: %s', async raw => {
    const storage = new MemoryStorage(); storage.values.set(SAVE_KEY, raw);
    const repo = new SaveRepository(storage, new SerialLocks());
    expect(await repo.saveSession(prefixSession(0))).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    expect(repo.getView().original!.raw).toBe(raw);
    storage.writeError = 'QuotaExceededError';
    expect(await repo.recoverPreservingOriginal()).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    storage.writeError = null;
    expect(await repo.recoverPreservingOriginal()).toBe(true);
    expect([...storage.values.entries()].filter(([key]) => key.startsWith('last-check.preserved.')).map(([, value]) => value)).toContain(raw);
    expect(validateSaveDocument(JSON.parse(storage.getItem(SAVE_KEY)!)).auto!.state.blockId).toBe('BLK_CH01_S01_01');
  });
  it('migrates a valid v3 save without inventing past entry checkpoints or editing the original', async () => {
    const storage = new MemoryStorage();
    const legacy = JSON.stringify(toPersistedGameState(prefixSession(14).game));
    storage.values.set(LEGACY_SAVE_KEY, legacy);
    const repo = new SaveRepository(storage, new SerialLocks());
    expect(repo.getView().migration).toBe(true);
    expect(repo.initialSession(freshSession().game).game.sceneId).toBe('CH06_S02_A');
    expect(await repo.migrate()).toBe(true);
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe(legacy);
    expect(repo.getView().durable!.runs.RUN_SAVE_ORIGINAL!.entries).toEqual({});
    expect(repo.getView().durable!.sourceHash).toBe(SOURCE_SHA256);
  });
  it.each([
    (doc: Record<string, any>) => { doc.runs.RUN_SAVE_ORIGINAL.entries.CH07.runId = 'RUN_OTHER'; },
    (doc: Record<string, any>) => { doc.runs.RUN_SAVE_ORIGINAL.entries.CH07.seed = 1; },
    (doc: Record<string, any>) => { doc.runs.RUN_SAVE_ORIGINAL.entries.CH08 = doc.runs.RUN_SAVE_ORIGINAL.entries.CH07; },
    (doc: Record<string, any>) => { doc.runs.RUN_SAVE_ORIGINAL.completed.parentRunId = 'RUN_OTHER'; },
    (doc: Record<string, any>) => { doc.runs.RUN_SAVE_ORIGINAL.entries.CH07.choiceHistory.push(doc.runs.RUN_SAVE_ORIGINAL.completed.choiceHistory[14]); },
    (doc: Record<string, any>) => {
      const [blockId, variantId] = Object.entries(root.completed!.resolvedVariants).find(([id]) => id.startsWith('BLK_CH07'))!;
      doc.runs.RUN_SAVE_ORIGINAL.entries.CH07.resolvedVariants[blockId] = variantId;
    },
  ])('rejects mixed-run/future chapter metadata while preserving the entire document (%#)', async mutate => {
    const storage = new MemoryStorage(), repo = new SaveRepository(storage,new SerialLocks());
    await repo.saveSession(completed);
    const doc = JSON.parse(storage.getItem(SAVE_KEY)!);
    mutate(doc);
    const raw = JSON.stringify(doc);
    storage.values.set(SAVE_KEY,raw);
    const damaged = new SaveRepository(storage,new SerialLocks());
    expect(await damaged.saveSession(prefixSession(0))).toBe(false);
    expect(damaged.getView().error).toBe('corrupt');
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });
  it.each([
    (s: Record<string, any>) => { s.evidence.push(s.evidence[0]); },
    (s: Record<string, any>) => { s.evidence.push('E99'); },
    (s: Record<string, any>) => { s.appliedEffects.push('FX_UNKNOWN'); },
    (s: Record<string, any>) => { s.relations.CHAR_SUHYEON.trust = 3; },
    (s: Record<string, any>) => { s.relations.CHAR_SUHYEON.suspicion = 4; },
    (s: Record<string, any>) => { s.seed = -1; },
    (s: Record<string, any>) => { s.version = 88; },
    (s: Record<string, any>) => { s.blockCursor = 999; },
    (s: Record<string, any>) => { s.resolvedVariantId = 'VAR_UNKNOWN'; },
    (s: Record<string, any>) => { s.revealedEvidenceSections.push('ESECTION_E02_ENVELOPE'); },
    (s: Record<string, any>) => { s.displayLog.push({...s.displayLog[0]}); },
    (s: Record<string, any>) => { s.flags.FLAG_UNKNOWN = true; },
    (s: Record<string, any>) => { s.image = 'data:image/png;base64,fake'; },
    (s: Record<string, any>) => { s.checkpoints = [s.sceneId]; },
  ])('rejects corrupt cross-field/ID/range or embedded payload without overwriting source (%#)', async mutate => {
    const storage = new MemoryStorage(); const valid = selectSession(prefixSession(0), 'C01_A');
    const bad = JSON.parse(JSON.stringify(toPersistedGameState(valid.game)));
    mutate(bad);
    expect(() => validateSnapshot(bad)).toThrow();
    const legacy = JSON.stringify(bad); storage.values.set(LEGACY_SAVE_KEY, legacy);
    const repo = new SaveRepository(storage, new SerialLocks());
    expect(await repo.saveSession(prefixSession(0))).toBe(false);
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe(legacy);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});

describe('protected checkpoint and execution isolation', () => {
  it('restoring the protected snapshot protects the new child before C24 is selected', async () => {
    const sourceBytes = JSON.stringify(root);
    let restored = forkSavedSnapshot(root.protected!,completed.runs,'RUN_PROTECTED_CHILD');
    expect(restored.runs.RUN_PROTECTED_CHILD!.protected!.runId).toBe('RUN_PROTECTED_CHILD');
    restored = selectSession(restored,'C24_A');
    const storage = new MemoryStorage(), repo = new SaveRepository(storage,new SerialLocks());
    expect(await repo.saveSession(restored)).toBe(true);
    expect(repo.getView().durable!.runs.RUN_PROTECTED_CHILD!.protected!.choiceHistory).toHaveLength(23);
    expect(repo.getView().durable!.auto!.state.choiceHistory).toHaveLength(24);
    expect(JSON.stringify(root)).toBe(sourceBytes);
  });
  it.each([
    { ending:'END_TRUE', route:TRUE_WITNESS },
    { ending:'END_GOOD', route:TRUE_WITNESS.map(id=>id==='C21_A'?'C21_B':id) },
    { ending:'END_GOOD', route:TRUE_WITNESS.map(id=>id==='C22_A'?'C22_B':id) },
    { ending:'END_BAD01', route:TRUE_WITNESS.map(id=>id==='C12_A'?'C12_B':id) },
    { ending:'END_BAD02', route:['C01_B','C02_B','C03_A','C04_B','C05_A','C06_B','C07_B','C08_B','C09_B','C10_C','C11_B','C12_B','C13_B','C14_B','C15_C','C16_B','C17_B','C18_B','C19_B','C20_B','C21_B','C22_B','C23_B','C24_B'] },
  ])('persists every ending block and restores $ending without retroactive rewards', async ({ending,route}) => {
    let session = saveSessionReducer(freshSession(),{type:'begin'});
    for (const choice of route) session = selectSession(session,choice);
    while(!session.game.sceneId.startsWith('END_')) session = advanceSession(session);
    const evidence = [...session.game.evidence], deductions = [...session.game.deductions];
    const storage = new MemoryStorage(), repo = new SaveRepository(storage,new SerialLocks());
    while(session.game.blockId) {
      expect(await repo.saveSession(session)).toBe(true);
      session = advanceSession(session);
    }
    expect(session.game.sceneId).toBe(ending);
    expect(await repo.saveSession(session)).toBe(true);
    const restored = new SaveRepository(storage,new SerialLocks()).initialSession(freshSession().game);
    expect([...restored.game.evidence].sort()).toEqual(evidence.sort());
    expect([...restored.game.deductions].sort()).toEqual(deductions.sort());
    expect(restored.runs[session.game.runId]!.completed!.sceneId).toBe(ending);
    expect(restored.runs[session.game.runId]!.protected!.choiceHistory).toHaveLength(23);
  });
  it('captures chapter entry before entry effects and protects the C24 state from later autosaves', async () => {
    expect(root.entries.CH01!.evidence).not.toContain('E01');
    expect(prefixSession(0).game.evidence.has('E01')).toBe(true);
    const protectedBefore = JSON.stringify(root.protected);
    expect(root.protected!.displayStage).toBe('choice');
    expect(root.protected!.choiceHistory).toHaveLength(23);
    expect(root.protected!.appliedEffects).not.toContain('FX_C24_A');
    const storage = new MemoryStorage(); const repo = new SaveRepository(storage, new SerialLocks());
    expect(await repo.saveSession(completed)).toBe(true);
    const title = saveSessionReducer(completed, { type:'title',runId:'RUN_TITLE',seed:3 });
    expect(await repo.saveSession(title)).toBe(true);
    expect(JSON.stringify(repo.getView().durable!.runs[root.runId]!.protected)).toBe(protectedBefore);
    expect(repo.getView().durable!.auto!.state.runId).toBe('RUN_TITLE');
    expect(repo.getView().durable!.runs[root.runId]!.completed!.sceneId).toBe('END_TRUE');
  });
  it('branches only a completed original actual entry, copies only its prefix and applies entry effects once', async () => {
    const before = JSON.stringify(root);
    const child = branchCompletedRun(completed.runs, root.runId, 'CH01', 'RUN_CHILD');
    expect(child.game.runId).toBe('RUN_CHILD');
    expect(child.game.parentRunId).toBe(root.runId);
    expect(child.game.seed).toBe(root.entries.CH01!.seed);
    expect(child.game.evidence.has('E01')).toBe(true);
    expect(child.runs.RUN_CHILD!.entries.CH01!.evidence).not.toContain('E01');
    expect(Object.keys(child.runs.RUN_CHILD!.entries)).toEqual(['CH01']);
    expect(child.game.choiceHistory).toEqual(root.entries.CH01!.choiceHistory);
    expect(child.game.evidence.has('E14')).toBe(false);
    expect(child.game.deductions.has('D6')).toBe(false);
    expect(child.game.revealedEvidenceSections.has('ESECTION_E14_01')).toBe(false);
    const replayed = saveSessionReducer(child, { type:'begin' });
    expect(replayed).toBe(child);
    expect(JSON.stringify(root)).toBe(before);
    const storage = new MemoryStorage(); const repo = new SaveRepository(storage, new SerialLocks());
    expect(await repo.saveSession(child)).toBe(true);
    const reopened = new SaveRepository(storage, new SerialLocks()).initialSession(freshSession().game);
    expect(toPersistedGameState(reopened.game)).toEqual(toPersistedGameState(child.game));
    expect(() => branchCompletedRun(prefixSession(2).runs,root.runId,'CH02','RUN_FORBIDDEN')).toThrow('엔딩 완료');
    expect(() => branchCompletedRun({...completed.runs,[root.runId]:{...root,entries:{CH01:root.entries.CH01!}}},root.runId,'CH02','RUN_UNREACHED')).toThrow('실제 도달');
  });
  it.each(['C15_A','C15_B','C15_C'] as const)('%s restores without duplicate rewards and manual rewind cannot mutate a completed source', async choice => {
    let child = branchCompletedRun(completed.runs, root.runId, 'CH07', `RUN_${choice}`);
    const before = child.game;
    child = selectSession(child, choice);
    const actor = choice === 'C15_C' ? 'CHAR_SUHYEON' : 'CHAR_JUNSEOK';
    expect(child.game.relations[actor]!.trust).toBe(Math.min(2,before.relations[actor]!.trust+1));
    const storage = new MemoryStorage(); const repo = new SaveRepository(storage, new SerialLocks());
    expect(await repo.saveSession(child,0)).toBe(true);
    const loaded = new SaveRepository(storage,new SerialLocks()).initialSession(freshSession().game);
    expect(applyEffectDefinition(loaded.game,GAME_INDEX.effects.get(`FX_${choice}`)!)).toBe(loaded.game);
    expect(saveSessionReducer(loaded,{type:'choose',choiceId:choice,sceneId:'CH07_S01'})).toBe(loaded);
    const manual = forkSavedSnapshot(toPersistedGameState(child.game),repo.getView().document.runs,`RUN_REWIND_${choice}`);
    expect(manual.game.parentRunId).toBe(child.game.runId);
    expect(manual.game.relations[actor]).toEqual(child.game.relations[actor]);
    expect(applyEffectDefinition(manual.game,GAME_INDEX.effects.get(`FX_${choice}`)!)).toBe(manual.game);
    expect(manual.runs[root.runId]!.completed).toEqual(root.completed);
  });
  it('never imports later original checkpoints or another run when loading an earlier manual snapshot', () => {
    const earlier = toPersistedGameState(prefixSession(2).game);
    const independent = freshSession('RUN_UNRELATED');
    const fork = forkSavedSnapshot(earlier,{...completed.runs,...independent.runs},'RUN_MANUAL_CHILD');
    expect(fork.game.choiceHistory).toEqual(earlier.choiceHistory);
    expect(Object.keys(fork.runs.RUN_MANUAL_CHILD!.entries)).toEqual(['CH01']);
    expect(fork.game.evidence.has('E14')).toBe(false);
    expect(fork.game.deductions.has('D6')).toBe(false);
    expect(fork.runs.RUN_UNRELATED!.entries).toEqual({});
    expect(toPersistedGameState(fork.game)).toEqual({...earlier,runId:'RUN_MANUAL_CHILD',parentRunId:earlier.runId});
  });
});

describe('profile separation', () => {
  it('persists preferences and collected endings independently, idempotently, without touching investigation', async () => {
    const storage = new MemoryStorage(),locks = new SerialLocks();
    const repo = new SaveRepository(storage,locks); await repo.saveSession(completed);
    const investigation = storage.getItem(SAVE_KEY);
    const profile = new ProfileRepository(storage,locks);
    expect(await profile.savePreferences({instantText:true})).toBe(true);
    expect(await profile.collectEnding('END_TRUE')).toBe(true);
    const collectedRaw = storage.getItem(ENDINGS_KEY);
    expect(await profile.collectEnding('END_TRUE')).toBe(true);
    expect(storage.getItem(ENDINGS_KEY)).toBe(collectedRaw);
    const reopened = new ProfileRepository(storage,locks);
    expect(reopened.getView().preferences.instantText).toBe(true);
    expect(reopened.getView().endings).toEqual(['END_TRUE']);
    expect(storage.getItem(PREFERENCES_KEY)).not.toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBe(investigation);
    const sibling = new ProfileRepository(storage,locks);
    await profile.collectEnding('END_GOOD'); await sibling.collectEnding('END_BAD01');
    expect([...new ProfileRepository(storage,locks).getView().endings].sort()).toEqual(['END_BAD01','END_GOOD','END_TRUE']);
  });
  it('keeps corrupt profile bytes and reports collection failure separately from successful case saves', async () => {
    const storage = new MemoryStorage(),locks = new SerialLocks();
    storage.values.set(ENDINGS_KEY,'broken');
    const profile = new ProfileRepository(storage,locks);
    expect(await profile.collectEnding('END_TRUE')).toBe(false);
    expect(storage.getItem(ENDINGS_KEY)).toBe('broken');
    expect(profile.getView().endingsError).toBe('corrupt');
    const repo = new SaveRepository(storage,locks);
    expect(await repo.saveSession(prefixSession(0))).toBe(true);
    expect(repo.getView().error).toBeNull();
    expect(new SaveRepository(storage,locks).initialSession(freshSession().game).game.deductions.size).toBe(0);
  });
});
