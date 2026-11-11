import { z } from 'zod';
import { SaveError, saveErrorCode, type ExclusiveLocks, type PreservedOriginal, type SaveErrorCode, type StorageAdapter } from './storage';

export const PREFERENCES_KEY = 'last-check.preferences.v1';
export const ENDINGS_KEY = 'last-check.endings.v1';
export const PreferencesSchema = z.object({ instantText: z.boolean() }).strict();
export type Preferences = z.infer<typeof PreferencesSchema>;
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1);
const PreferencesDocument = z.object({ version: z.literal(1), revision, preferences: PreferencesSchema }).strict();
const EndingId = z.enum(['END_TRUE', 'END_GOOD', 'END_BAD01', 'END_BAD02']);
export type CollectedEndingId = z.infer<typeof EndingId>;
const EndingsDocument = z.object({ version: z.literal(1), revision, endings: z.array(EndingId).refine(ids => new Set(ids).size === ids.length) }).strict();
export interface ProfileView {
  readonly preferences: Preferences;
  readonly endings: readonly CollectedEndingId[];
  readonly preferencesError: SaveErrorCode | null;
  readonly endingsError: SaveErrorCode | null;
  readonly preferencesOriginal: PreservedOriginal | null;
  readonly endingsOriginal: PreservedOriginal | null;
}
function parseDocument<T>(schema: z.ZodType<T>, raw: string): T {
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { throw new SaveError('corrupt'); }
  if (typeof value === 'object' && value !== null && 'version' in value && value.version !== 1) throw new SaveError('incompatible');
  const result = schema.safeParse(value);
  if (!result.success) throw new SaveError('corrupt');
  return result.data;
}

/** No investigation state is accepted or returned by this store. Endings are a local, idempotent collection only. */
export class ProfileRepository {
  private view: ProfileView = { preferences: { instantText: false }, endings: [], preferencesError: null, endingsError: null, preferencesOriginal: null, endingsOriginal: null };
  private preferencesRaw: string | null = null;
  private readonly listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: StorageAdapter, private readonly locks: ExclusiveLocks) {
    for (const kind of ['preferences', 'endings'] as const) {
      const key = kind === 'preferences' ? PREFERENCES_KEY : ENDINGS_KEY;
      let raw: string | null = null;
      try {
        raw = storage.getItem(key);
        if (kind === 'preferences') {
          this.preferencesRaw = raw;
          if (raw !== null) this.view = { ...this.view, preferences: parseDocument(PreferencesDocument, raw).preferences };
        } else if (raw !== null) this.view = { ...this.view, endings: parseDocument(EndingsDocument, raw).endings };
      } catch (error) {
        this.view = { ...this.view, [`${kind}Error`]: saveErrorCode(error), [`${kind}Original`]: raw === null ? null : { key, raw } };
      }
    }
  }
  readonly getView = (): ProfileView => this.view;
  readonly subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(patch: Partial<ProfileView>) { this.view = { ...this.view, ...patch }; for (const listener of this.listeners) listener(); }
  savePreferences(preferences: Preferences): Promise<boolean> {
    const parsed = PreferencesSchema.parse(preferences);
    this.publish({ preferences: parsed });
    const job = this.queue.then(async () => {
      try {
        await this.locks.run(PREFERENCES_KEY, () => {
          const raw = this.storage.getItem(PREFERENCES_KEY);
          if (raw !== this.preferencesRaw) throw new SaveError('conflict');
          const previous = raw === null ? null : parseDocument(PreferencesDocument, raw);
          const document = PreferencesDocument.parse({ version: 1, revision: (previous?.revision ?? 0) + 1, preferences: parsed });
          const encoded = JSON.stringify(document);
          this.storage.setItem(PREFERENCES_KEY, encoded);
          if (this.storage.getItem(PREFERENCES_KEY) !== encoded) throw new SaveError('conflict');
          this.preferencesRaw = encoded;
        });
        this.publish({ preferencesError: null }); return true;
      } catch (error) { this.publish({ preferencesError: saveErrorCode(error) }); return false; }
    });
    this.queue = job; return job;
  }
  collectEnding(id: string): Promise<boolean> {
    const ending = EndingId.parse(id);
    this.publish({ endings: [...new Set([...this.view.endings, ending])] });
    const job = this.queue.then(async () => {
      try {
        await this.locks.run(ENDINGS_KEY, () => {
          const raw = this.storage.getItem(ENDINGS_KEY);
          const previous = raw === null ? null : parseDocument(EndingsDocument, raw);
          const endings = [...new Set([...previous?.endings ?? [], ...this.view.endings])].sort();
          if (previous && JSON.stringify(previous.endings.slice().sort()) === JSON.stringify(endings)) return;
          const document = EndingsDocument.parse({ version: 1, revision: (previous?.revision ?? 0) + 1, endings });
          const encoded = JSON.stringify(document);
          this.storage.setItem(ENDINGS_KEY, encoded);
          if (this.storage.getItem(ENDINGS_KEY) !== encoded) throw new SaveError('conflict');
        });
        this.publish({ endingsError: null }); return true;
      } catch (error) { this.publish({ endingsError: saveErrorCode(error) }); return false; }
    });
    this.queue = job; return job;
  }
  async flush(): Promise<void> { await this.queue; }
}
