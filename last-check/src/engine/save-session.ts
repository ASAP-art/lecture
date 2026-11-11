import { GAME_CONTENT, GAME_INDEX } from '../content/game-content';
import type { ChapterId } from '../content/ids';
import { initializeContentFlags, type ChapterEntryCapture } from './gameplay';
import { gameReducer, type GameAction } from './reducer';
import { fromPersistedGameState, toPersistedGameState, type RuntimeGameState, type PersistedGameState } from './state';
import { isCompletedEnding, validateEntry, validateSnapshot, type RunRecord } from './save-schema';

export interface SaveSession {
  readonly game: RuntimeGameState;
  readonly runs: Readonly<Record<string, RunRecord>>;
  readonly sequence: number;
}
export type SessionAction = GameAction | { type: 'restoreSession'; session: SaveSession };

export function newRunRecord(state: RuntimeGameState | PersistedGameState): RunRecord {
  return { runId: state.runId, parentRunId: state.parentRunId, entries: {}, protected: null, completed: null };
}
function captureBoundary(game: RuntimeGameState, record: RunRecord): RunRecord {
  if (!record.protected && game.displayStage === 'choice' && GAME_INDEX.scenes.get(game.sceneId)?.choices.some(c => c.id === 'C24_A')) {
    record = { ...record, protected: toPersistedGameState(game) };
  }
  if (!record.completed && game.displayStage === 'complete' && GAME_INDEX.scenes.get(game.sceneId)?.endCommand === 'TITLE') {
    record = { ...record, completed: toPersistedGameState(game) };
  }
  return record;
}

export function createSaveSession(game: RuntimeGameState, runs: Readonly<Record<string, RunRecord>> = {}): SaveSession {
  const initialized = initializeContentFlags(game, GAME_INDEX);
  return { game: initialized, runs: { ...runs, [game.runId]: captureBoundary(initialized, runs[game.runId] ?? newRunRecord(initialized)) }, sequence: 0 };
}
export function saveSessionReducer(session: SaveSession, action: SessionAction): SaveSession {
  if (action.type === 'restoreSession') return { ...action.session, sequence: session.sequence + 1 };
  const captures: ChapterEntryCapture[] = [];
  const game = gameReducer(session.game, action, captures);
  if (game === session.game) return session;
  let record = session.runs[game.runId] ?? newRunRecord(game);
  for (const capture of captures) {
    if (record.entries[capture.chapterId]) continue;
    const entry = toPersistedGameState(capture.state);
    record = { ...record, entries: { ...record.entries, [capture.chapterId]: entry } };
  }
  record = captureBoundary(game, record);
  return { game, runs: { ...session.runs, [game.runId]: record }, sequence: session.sequence + 1 };
}

function forkSnapshot(snapshot: PersistedGameState, source: RunRecord, runs: Readonly<Record<string, RunRecord>>, runId: string): SaveSession {
  validateSnapshot(snapshot);
  if (snapshot.runId !== source.runId || snapshot.parentRunId !== source.parentRunId ||
      (source.completed && !snapshot.choiceHistory.every((h, i) => JSON.stringify(h) === JSON.stringify(source.completed!.choiceHistory[i])))) {
    throw new Error('원본 실행과 저장 이력이 다릅니다.');
  }
  if (runs[runId] || runId === source.runId) throw new Error('분기 runId는 새 ID여야 합니다.');
  const game = fromPersistedGameState({ ...snapshot, runId, parentRunId: source.runId });
  const entries = Object.fromEntries(Object.entries(source.entries)
    .filter(([, entry]) => entry.saveRevision <= snapshot.saveRevision && entry.choiceHistory.every((h, i) => JSON.stringify(h) === JSON.stringify(snapshot.choiceHistory[i])))
    .map(([chapterId, entry]) => [chapterId, { ...entry, runId, parentRunId: source.runId }]));
  const protectedState = source.protected && source.protected.saveRevision <= snapshot.saveRevision &&
    source.protected.choiceHistory.every((h, i) => JSON.stringify(h) === JSON.stringify(snapshot.choiceHistory[i]))
    ? { ...source.protected, runId, parentRunId: source.runId } : null;
  const record: RunRecord = { ...newRunRecord(game), entries, protected: protectedState };
  return createSaveSession(game, { ...runs, [runId]: record });
}

/** Manual/protected rewind is an isolated copy; reconnecting the automatic slot keeps its original runId. */
export function forkSavedSnapshot(snapshot: PersistedGameState, runs: Readonly<Record<string, RunRecord>>, runId: string): SaveSession {
  const source = runs[snapshot.runId];
  if (!source) throw new Error('저장 원본 실행이 없습니다.');
  return forkSnapshot(snapshot, source, runs, runId);
}

/** Only the completed source run's actual pre-entry snapshot is eligible, never a chapter invented from history. */
export function branchCompletedRun(runs: Readonly<Record<string, RunRecord>>, sourceRunId: string, chapterId: ChapterId, runId: string): SaveSession {
  const source = runs[sourceRunId];
  const entry = source?.entries[chapterId];
  if (!source?.completed || !isCompletedEnding(source.completed) || !entry) throw new Error('엔딩 완료 원본의 실제 도달 챕터만 분기할 수 있습니다.');
  validateEntry(chapterId, entry);
  const session = forkSnapshot(entry, source, runs, runId);
  return saveSessionReducer(session, { type: 'begin' });
}

export function reachedChapterIds(record: RunRecord): ChapterId[] {
  return GAME_CONTENT.chapters.map(c => c.id).filter(id => record.entries[id] !== undefined);
}
