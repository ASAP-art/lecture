import { GAME_CONTENT } from '../../src/content/game-content';
import type { ChoiceId } from '../../src/content/ids';
import { createInitialState } from '../../src/engine/state';
import { createSaveSession, saveSessionReducer, type SaveSession } from '../../src/engine/save-session';
import type { ExclusiveLocks, StorageAdapter } from '../../src/engine/storage';
import { TRUE_WITNESS } from '../fixtures/decision-oracle';

export class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  writes = 0;
  writeError: string | null = null;
  readError = false;
  getItem(key: string) { if (this.readError) throw new DOMException('blocked', 'SecurityError'); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.writeError) throw new DOMException('failed', this.writeError);
    this.writes += 1; this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}
export class SerialLocks implements ExclusiveLocks {
  private readonly tails = new Map<string, Promise<unknown>>();
  async run<T>(name: string, action: () => T | Promise<T>): Promise<T> {
    const next = (this.tails.get(name) ?? Promise.resolve()).then(action);
    this.tails.set(name, next.catch(() => undefined));
    return next;
  }
}
export function freshSession(runId = 'RUN_SAVE_ORIGINAL'): SaveSession {
  return createSaveSession(createInitialState({ runId, sceneId: 'CH01_S01', seed: 0xffffffff, characterIds: GAME_CONTENT.characters.map(c => c.id) }));
}
export function advanceSession(session: SaveSession): SaveSession {
  return saveSessionReducer(session, { type: 'continueBlock', blockId: session.game.blockId });
}
export function boundary(session: SaveSession): SaveSession {
  while (session.game.blockId) session = advanceSession(session);
  return session;
}
export function selectSession(session: SaveSession, choiceId: ChoiceId): SaveSession {
  session = boundary(session);
  return saveSessionReducer(session, { type: 'choose', choiceId, sceneId: session.game.sceneId });
}
export function prefixSession(count: number): SaveSession {
  let session = saveSessionReducer(freshSession(), { type: 'begin' });
  for (const choice of TRUE_WITNESS.slice(0, count)) session = selectSession(session, choice);
  return session;
}
export function completedSession(): SaveSession { return boundary(prefixSession(24)); }
