import { z } from 'zod';
import { SOURCE_SHA256 } from '../content/source';
import { GAME_INDEX } from '../content/game-content';
import { initializeContentFlags } from './gameplay';
import { deserializeGameState, fromPersistedGameState, toPersistedGameState } from './state';
import { createSaveSession, newRunRecord, type SaveSession } from './save-session';
import { emptySaveDocument, isCompletedEnding, isPreAccusation, validateEntry, validateSaveDocument, validateSnapshot, type SaveDocument, type RunRecord } from './save-schema';

export const SAVE_KEY = 'last-check.saves.v1';
export const LEGACY_SAVE_KEY = 'last-check.save.v3';
export const SAVE_LOCK = 'last-check.investigation';
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface ExclusiveLocks {
  run<T>(name: string, action: () => T | Promise<T>): Promise<T>;
}
export type SaveErrorCode = 'blocked' | 'quota' | 'conflict' | 'corrupt' | 'incompatible' | 'invalid' | 'io';
export class SaveError extends Error {
  constructor(readonly code: SaveErrorCode) { super(code); }
}
export const SAVE_ERRORS: Record<SaveErrorCode, string> = {
  blocked: '브라우저 저장 접근 또는 안전한 탭 잠금이 차단됐습니다. 메모리 진행은 유지됩니다.',
  quota: '저장 공간이 부족합니다. 기존 저장과 메모리 진행을 유지했습니다. 공간 확보 후 다시 저장하세요.',
  conflict: '다른 탭의 저장이 변경됐습니다. 덮어쓰지 않았습니다. 메모리 기록을 내보내거나 다른 탭 자동 저장을 불러오세요.',
  corrupt: '저장 손상을 발견했습니다. 원본을 보전하고 덮어쓰기를 차단했습니다.',
  incompatible: '호환되지 않는 저장입니다. 원본을 보전하고 덮어쓰기를 차단했습니다.',
  invalid: '현재 저장 상태의 무결성을 확인하지 못했습니다. 저장하지 않았으며 메모리 진행은 유지됩니다.',
  io: '저장 완료를 확인하지 못했습니다. 메모리 진행은 유지됩니다.',
};
export function saveErrorCode(error: unknown): SaveErrorCode {
  if (error instanceof SaveError) return error.code;
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'quota';
  if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'NotAllowedError')) return 'blocked';
  return 'io';
}
export const browserStorage: StorageAdapter = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
};
/** A read/check/write pair alone is not a cross-tab compare-and-swap. Never silently use that unsafe fallback. */
export const browserLocks: ExclusiveLocks = {
  async run(name, action) {
    if (!navigator.locks) throw new SaveError('blocked');
    return navigator.locks.request(name, { mode: 'exclusive' }, action);
  },
};
export interface PreservedOriginal { readonly key: string; readonly raw: string }
export interface SaveView {
  readonly document: SaveDocument;
  readonly durable: SaveDocument | null;
  readonly pending: number;
  readonly error: SaveErrorCode | null;
  readonly original: PreservedOriginal | null;
  readonly migration: boolean;
}
function decode(raw: string): SaveDocument {
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; } catch { throw new SaveError('corrupt'); }
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    if (parsed.version !== 1) throw new SaveError('incompatible');
    if ('sourceHash' in parsed && parsed.sourceHash !== SOURCE_SHA256) throw new SaveError('incompatible');
  }
  try { return validateSaveDocument(parsed); } catch (error) {
    if (error instanceof z.ZodError && error.issues.some(issue => issue.path.at(-1) === 'version')) throw new SaveError('incompatible');
    throw new SaveError('corrupt');
  }
}

export class SaveRepository {
  private working = emptySaveDocument();
  private durable: SaveDocument | null = null;
  private diskRaw: string | null = null;
  private migrationRaw: string | null = null;
  private error: SaveErrorCode | null = null;
  private original: PreservedOriginal | null = null;
  private blocked = false;
  private migration = false;
  private pending = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  private view!: SaveView;
  private recoveryKey: string | null = null;

  constructor(private readonly storage: StorageAdapter, private readonly locks: ExclusiveLocks) { this.open(); }
  readonly getView = (): SaveView => this.view;
  readonly subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish() {
    this.view = { document: this.working, durable: this.durable, pending: this.pending, error: this.error, original: this.original, migration: this.migration };
    for (const listener of this.listeners) listener();
  }
  private open() {
    this.error = null; this.blocked = false; this.original = null; this.migration = false; this.migrationRaw = null;
    this.working = emptySaveDocument(); this.durable = null;
    try {
      this.diskRaw = this.storage.getItem(SAVE_KEY);
      if (this.diskRaw !== null) {
        this.original = { key: SAVE_KEY, raw: this.diskRaw };
        this.working = decode(this.diskRaw);
        this.durable = this.working;
        this.original = null;
      } else {
        const legacy = this.storage.getItem(LEGACY_SAVE_KEY);
        if (legacy !== null) {
          this.original = { key: LEGACY_SAVE_KEY, raw: legacy };
          let state;
          try { state = validateSnapshot(toPersistedGameState(initializeContentFlags(deserializeGameState(legacy), GAME_INDEX))); }
          catch (error) {
            if (error instanceof z.ZodError && error.issues.some(issue => issue.path.at(-1) === 'version')) throw new SaveError('incompatible');
            throw new SaveError('corrupt');
          }
          const run = newRunRecord(state);
          if (isPreAccusation(state)) run.protected = state;
          if (isCompletedEnding(state)) run.completed = state;
          this.working = { ...this.working, auto: { state, savedAt: Date.now() }, runs: { [run.runId]: run } };
          this.migrationRaw = legacy; this.migration = true;
          this.original = null;
        }
      }
    } catch (error) { this.error = saveErrorCode(error); this.blocked = true; }
    this.publish();
  }
  initialSession(fresh: Parameters<typeof createSaveSession>[0]): SaveSession {
    return createSaveSession(this.working.auto ? fromPersistedGameState(this.working.auto.state) : fresh, this.working.runs);
  }
  private mergeRuns(incoming: Readonly<Record<string, RunRecord>>): Record<string, RunRecord> {
    const runs = { ...this.working.runs };
    for (const [id, run] of Object.entries(incoming)) {
      const previous = runs[id];
      if (previous === run) continue;
      if (id !== run.runId || id === run.parentRunId || (previous && previous.parentRunId !== run.parentRunId)) throw new SaveError('invalid');
      if (previous?.completed) {
        if (run.completed && JSON.stringify(previous.completed) !== JSON.stringify(run.completed)) throw new SaveError('invalid');
        continue; // Completed originals, including their entry snapshots, are immutable.
      }
      for (const [chapterId, entry] of Object.entries(run.entries)) {
        if (entry.runId !== id || entry.parentRunId !== run.parentRunId) throw new SaveError('invalid');
        if (previous?.entries[chapterId]) {
          if (JSON.stringify(previous.entries[chapterId]) !== JSON.stringify(entry)) throw new SaveError('invalid');
        } else validateEntry(chapterId, entry);
      }
      for (const snapshot of [run.protected, run.completed]) if (snapshot) {
        validateSnapshot(snapshot);
        if (snapshot.runId !== id || snapshot.parentRunId !== run.parentRunId) throw new SaveError('invalid');
      }
      if (run.protected && !isPreAccusation(run.protected)) throw new SaveError('invalid');
      if (run.completed && !isCompletedEnding(run.completed)) throw new SaveError('invalid');
      if (previous?.protected && run.protected && JSON.stringify(previous.protected) !== JSON.stringify(run.protected)) throw new SaveError('invalid');
      runs[id] = { ...run, entries: { ...previous?.entries, ...run.entries }, protected: previous?.protected ?? run.protected };
    }
    return runs;
  }
  private stage(session: SaveSession, manualIndex?: number): SaveDocument {
    const state = validateSnapshot(toPersistedGameState(session.game));
    const runs = this.mergeRuns(session.runs);
    const record = runs[state.runId];
    if (!record || (record.completed && JSON.stringify(record.completed) !== JSON.stringify(state))) throw new SaveError('invalid');
    const slot = { state, savedAt: Date.now() };
    const manual = [...this.working.manual] as SaveDocument['manual'];
    if (manualIndex !== undefined) {
      if (!Number.isInteger(manualIndex) || manualIndex < 0 || manualIndex > 2) throw new SaveError('invalid');
      manual[manualIndex] = slot;
    }
    this.working = { ...this.working, runs, auto: slot, manual };
    return this.working;
  }
  private async write(candidate: SaveDocument): Promise<void> {
    const current = this.storage.getItem(SAVE_KEY);
    if (current !== this.diskRaw) throw new SaveError('conflict');
    if (this.migration && this.storage.getItem(LEGACY_SAVE_KEY) !== this.migrationRaw) throw new SaveError('conflict');
    const revision = (this.durable?.revision ?? 0) + 1;
    if (!Number.isSafeInteger(revision) || revision >= Number.MAX_SAFE_INTEGER) throw new SaveError('invalid');
    const document = { ...candidate, revision };
    const raw = JSON.stringify(document);
    this.storage.setItem(SAVE_KEY, raw);
    if (this.storage.getItem(SAVE_KEY) !== raw) throw new SaveError('conflict');
    this.diskRaw = raw; this.durable = document; this.migration = false; this.migrationRaw = null;
    this.error = null;
  }
  private enqueue(candidate: SaveDocument, recover = false): Promise<boolean> {
    this.pending += 1; this.publish();
    const job = this.queue.then(async () => {
      try {
        await this.locks.run(SAVE_LOCK, async () => {
          if (recover) {
            const original = this.original;
            if (!original || this.storage.getItem(original.key) !== original.raw) throw new SaveError('conflict');
            if (!this.recoveryKey) this.recoveryKey = `last-check.preserved.${crypto.randomUUID()}`;
            this.storage.setItem(this.recoveryKey, original.raw);
            if (this.storage.getItem(this.recoveryKey) !== original.raw) throw new SaveError('io');
          } else if (this.blocked) throw new SaveError(this.error ?? 'blocked');
          await this.write(candidate);
          if (recover) { this.blocked = false; this.original = null; }
        });
        return true;
      } catch (error) { this.error = saveErrorCode(error); return false; }
      finally { this.pending -= 1; this.publish(); }
    });
    this.queue = job;
    return job;
  }
  saveSession(session: SaveSession, manualIndex?: number): Promise<boolean> {
    try { return this.enqueue(this.stage(session, manualIndex)); }
    catch { this.error = 'invalid'; this.publish(); return Promise.resolve(false); }
  }
  migrate(): Promise<boolean> { return this.migration ? this.enqueue(this.working) : Promise.resolve(true); }
  retry(): Promise<boolean> { return this.enqueue(this.working); }
  recoverPreservingOriginal(): Promise<boolean> {
    if (!this.original || this.pending > 0) return Promise.resolve(false);
    return this.enqueue(this.working, true);
  }
  /** Explicit replacement only. Never merge remote evidence, effects or histories into the in-memory run. */
  reloadAutomatic(): SaveSession | null {
    if (this.pending > 0) return null;
    const opened = new SaveRepository(this.storage, this.locks);
    this.diskRaw = opened.diskRaw;
    this.durable = opened.durable;
    this.error = opened.error;
    this.blocked = opened.blocked;
    this.original = opened.original;
    this.migration = opened.migration;
    this.migrationRaw = opened.migrationRaw;
    if (!opened.error && opened.working.auto) this.working = opened.working;
    this.publish();
    return opened.error || !opened.working.auto ? null : createSaveSession(fromPersistedGameState(opened.working.auto.state), opened.working.runs);
  }
  checkExternalChange(): void {
    try { if (this.storage.getItem(SAVE_KEY) !== this.diskRaw) { this.error = 'conflict'; this.publish(); } }
    catch (error) { this.error = saveErrorCode(error); this.publish(); }
  }
  exportMemory(session: SaveSession): string {
    return JSON.stringify({
      ...this.working,
      revision: this.durable?.revision ?? 0,
      auto: { state: toPersistedGameState(session.game), savedAt: Date.now() },
      runs: { ...this.working.runs, ...session.runs },
    });
  }
  async flush(): Promise<void> { await this.queue; }
}
