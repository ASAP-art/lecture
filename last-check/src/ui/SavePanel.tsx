import { useEffect, useRef, useState } from 'react';
import { GAME_INDEX } from '../content/game-content';
import { branchCompletedRun, forkSavedSnapshot, reachedChapterIds, type SaveSession } from '../engine/save-session';
import type { PersistedGameState, RuntimeGameState } from '../engine/state';
import { SAVE_ERRORS, type SaveRepository, type SaveView } from '../engine/storage';
import type { ProfileRepository, ProfileView } from '../engine/profile-storage';

import { ReadingSettings } from './ReadingSettings';
import type { ReadingPreferences } from './reading-preferences';
import { containDialogTab } from './dialog-focus';
export function saveStatus(view: SaveView, state: RuntimeGameState): string {
  if (view.error) return view.error === 'conflict' ? '탭 충돌 · 메모리 진행' : '저장 실패 · 메모리 진행';
  if (view.pending || view.migration) return '저장 중';
  const saved = view.durable?.auto?.state;
  return saved?.runId === state.runId && saved.saveRevision === state.saveRevision
    ? `저장 완료 · r${view.durable!.revision}` : '아직 저장되지 않음';
}
function download(name: string, raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function location(state: PersistedGameState | undefined): string {
  if (!state) return '빈 슬롯';
  return `${GAME_INDEX.scenes.get(state.sceneId)!.title} · 진행 ${state.saveRevision}`;
}
interface PendingReplace {
  readonly description: string;
  readonly execute: () => void;
}
interface Props {
  session: SaveSession;
  repository: SaveRepository;
  view: SaveView;
  profile: ProfileRepository;
  profileView: ProfileView;
  createRunId(): string;
  createSeed(): number;
  restore(session: SaveSession): void;
  startNewGame(): void;
  returnToTitle(): void;
  onClose?(): void;
  onConfirmOpenChange?(open: boolean): void;
  readingPreferences: ReadingPreferences;
  onReadingChange(patch: Partial<ReadingPreferences>): void;
  readingError: string | null;
  focusReadingSettings: boolean;
}
export function SavePanel({
  session,
  repository,
  view,
  profile,
  profileView,
  createRunId,
  restore,
  startNewGame,
  returnToTitle,
  onClose,
  onConfirmOpenChange,
  readingPreferences,
  onReadingChange,
  readingError,
  focusReadingSettings,
}: Props) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const runs = { ...view.document.runs, ...session.runs };
  const record = runs[session.game.runId];
  const protectedState = record?.protected;
  const archived = Object.values(runs).filter(run => run.completed);
  const busy = view.pending > 0;
  const hasActiveProgress =
    session.game.displayStage !== 'scene' ||
    session.game.displayLog.length > 0 ||
    session.game.choiceHistory.length > 0;
  const autoIncompatible = view.error === 'corrupt' || view.error === 'incompatible';
  const canContinueAuto = !busy && !autoIncompatible && (Boolean(view.durable?.auto) || view.error === 'conflict');

  useEffect(() => {
    if (focusReadingSettings) panelRef.current?.querySelector<HTMLElement>('#preferences-heading')?.focus();
    else panelRef.current?.focus();
  }, [focusReadingSettings]);
  useEffect(() => {
    onConfirmOpenChange?.(pendingReplace !== null);
    if (pendingReplace) {
      confirmButtonRef.current?.focus();
    }
  }, [pendingReplace, onConfirmOpenChange]);

  const guarded = (action: () => void) => {
    try { action(); setLoadError(null); }
    catch (error) { setLoadError(error instanceof Error ? error.message : '불러오기에 실패했습니다. 현재 진행은 유지됩니다.'); }
  };
  const closeConfirm = () => {
    setPendingReplace(null);
    const trigger = confirmTriggerRef.current;
    window.setTimeout(() => trigger?.focus(), 0);
  };
  const requestReplace = (label: string, trigger: HTMLButtonElement, execute: () => void, description = `현재 진행 중인 수사 상태를 ‘${label}’ 상태로 교체합니다. 계속하시겠습니까?`) => {
    if (!hasActiveProgress) {
      guarded(execute);
      return;
    }
    confirmTriggerRef.current = trigger;
    setPendingReplace({ description, execute });
  };
  return (
    <section
      ref={panelRef}
      className="save-panel"
      id="save-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-heading"
      tabIndex={-1}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => containDialogTab(event, pendingReplace
        ? panelRef.current?.querySelector<HTMLElement>('.confirm-dialog') ?? null
        : panelRef.current)}
    >
      <div className="save-panel-header" inert={pendingReplace !== null || undefined}>
        <h2 id="save-heading">기본 메뉴 · 저장과 불러오기</h2>
        {onClose && (
          <button type="button" className="notebook-toggle" onClick={event => { event.stopPropagation(); onClose(); }}>
            메뉴 닫기
          </button>
        )}
      </div>
      <p>자동 1개 · 수동 3개. 수동·보호본 불러오기는 현재 상태를 교체한 별도 실행이며, 이전 실행의 자료를 합치지 않습니다.</p>
      <div inert={pendingReplace !== null || undefined}>
        <ReadingSettings
          preferences={readingPreferences} onChange={onReadingChange}
          instantText={profileView.preferences.instantText}
          onInstantTextChange={instantText => { void profile.savePreferences({ instantText }); }}
          error={readingError}
          instantError={profileView.preferencesError ? SAVE_ERRORS[profileView.preferencesError] : null}
        />
      </div>
      {view.error && <p className="save-error" role="alert">{SAVE_ERRORS[view.error]}</p>}
      {loadError && <p className="save-error" role="alert">{loadError}</p>}
      {pendingReplace && (
        <div
          className="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-replace-heading"
          aria-describedby="confirm-replace-desc"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closeConfirm();
            }
          }}
        >
          <h3 id="confirm-replace-heading">진행 교체 확인</h3>
          <p id="confirm-replace-desc">
            {pendingReplace.description}
          </p>
          <div className="save-actions">
            <button
              ref={confirmButtonRef}
              type="button"
              className="primary-action"
              onClick={event => {
                event.stopPropagation();
                const action = pendingReplace.execute;
                setPendingReplace(null);
                guarded(action);
              }}
            >
              진행 교체 확인
            </button>
            <button
              type="button"
              className="continue-action"
              onClick={event => {
                event.stopPropagation();
                closeConfirm();
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
      <div inert={pendingReplace !== null || undefined}>
      <div className="save-actions">
        <button
          type="button"
          className="continue-action"
          disabled={!canContinueAuto}
          onClick={event => {
            event.stopPropagation();
            requestReplace('이어하기 (자동 저장)', event.currentTarget, () => {
              const loaded = repository.reloadAutomatic();
              if (loaded) {
                restore(loaded);
                onClose?.();
              }
            });
          }}
        >
          이어하기
        </button>
        <button
          type="button"
          className="continue-action"
          disabled={busy}
          onClick={event => {
            event.stopPropagation();
            requestReplace('새 게임 시작', event.currentTarget, startNewGame, '새 게임 소개로 이동합니다. 소개를 마치거나 건너뛰어 조사를 시작할 때 새 실행으로 전환합니다.');
          }}
        >
          새 게임 시작
        </button>
        {hasActiveProgress && (
          <button
            type="button"
            className="continue-action"
            disabled={busy}
            onClick={event => {
              event.stopPropagation();
              requestReplace('타이틀 화면 복귀', event.currentTarget, returnToTitle, '현재 진행과 저장을 유지한 채 시작 메뉴로 돌아갑니다. 이어하기로 조사를 계속할 수 있습니다.');
            }}
          >
            타이틀 화면으로
          </button>
        )}
        <button type="button" className="continue-action" disabled={busy} onClick={() => { void repository.saveSession(session); }}>현재 진행 다시 저장</button>
        <button type="button" className="continue-action" onClick={() => download('last-check-memory.json', repository.exportMemory(session))}>메모리 기록 내보내기</button>
        {view.original && <>
          <button type="button" className="continue-action" onClick={() => download('last-check-original.json', view.original!.raw)}>보전 원본 내보내기</button>
          <button type="button" className="continue-action" disabled={busy} onClick={() => { void repository.recoverPreservingOriginal(); }}>원본 보관 후 새 저장 시작</button>
        </>}
      </div>
      <ul className="save-slots">
        <li>
          <div>
            <strong>자동 저장</strong>
            <p>{autoIncompatible ? '비호환 또는 손상된 저장 (이어하기 비활성)' : location(view.durable?.auto?.state)}</p>
          </div>
          <button
            type="button"
            className="continue-action"
            disabled={!canContinueAuto}
            onClick={event => {
              event.stopPropagation();
              guarded(() => {
                const loaded = repository.reloadAutomatic();
                if (loaded) restore(loaded);
              });
            }}
          >
            {view.error === 'conflict' ? '다른 탭 자동 저장 불러오기' : '자동 불러오기'}
          </button>
        </li>
        {view.document.manual.map((_, index) => {
          const slot = view.durable?.manual[index];
          return <li key={index}>
            <div><strong>수동 {index + 1}</strong><p>{location(slot?.state)}</p></div>
            <div className="save-actions">
              <button type="button" className="continue-action" disabled={busy} onClick={() => { void repository.saveSession(session, index); }}>슬롯 {index + 1} 저장</button>
              <button
                type="button"
                className="continue-action"
                disabled={busy || !slot || autoIncompatible}
                onClick={event => {
                  event.stopPropagation();
                  guarded(() => restore(forkSavedSnapshot(slot!.state, runs, createRunId())));
                }}
              >
                슬롯 {index + 1} 불러오기
              </button>
            </div>
          </li>;
        })}
        <li>
          <div><strong>지목전 보호본{protectedState && !view.durable?.runs[session.game.runId]?.protected ? ' · 메모리' : ''}</strong><p>{protectedState ? location(protectedState) : '최종 지목 선택 직전에 별도 보전됩니다.'}</p></div>
          <button
            type="button"
            className="continue-action"
            disabled={busy || !protectedState}
            onClick={event => {
              event.stopPropagation();
              guarded(() => restore(forkSavedSnapshot(protectedState!, runs, createRunId())));
            }}
          >
            지목전 보호본 불러오기
          </button>
        </li>
      </ul>
      <section aria-labelledby="chapter-restore-heading">
        <h3 id="chapter-restore-heading">엔딩 원본에서 챕터 분기</h3>
        <p>엔딩을 끝까지 완료한 원본의 실제 입장 전 기록만 사용합니다. 이후의 증거·관계·공개 기록은 가져오지 않습니다.</p>
        {archived.length === 0 ? <p>엔딩 완료 후 도달한 챕터가 표시됩니다.</p> : archived.map((run, index) => <div className="chapter-restore" key={run.runId}>
          <h4>완료 실행 {index + 1} · {GAME_INDEX.scenes.get(run.completed!.sceneId)!.title}{!view.durable?.runs[run.runId]?.completed ? ' · 메모리' : ''}</h4>
          {reachedChapterIds(run).length === 0 ? <p>이전 버전 저장에는 입장 전 기록이 없어 챕터 분기를 제공하지 않습니다.</p> : <div className="save-actions">
            {reachedChapterIds(run).map(chapterId => (
              <button
                type="button"
                className="continue-action"
                key={chapterId}
                disabled={busy}
                onClick={event => {
                  event.stopPropagation();
                  guarded(() => restore(branchCompletedRun(runs, run.runId, chapterId, createRunId())));
                }}
              >
                {chapterId}에서 분기
              </button>
            ))}
          </div>}
          {run.protected && (
            <button
              type="button"
              className="continue-action"
              disabled={busy}
              onClick={event => {
                event.stopPropagation();
                guarded(() => restore(forkSavedSnapshot(run.protected!, runs, createRunId())));
              }}
            >
              완료 실행 {index + 1} 지목전 보호본 불러오기
            </button>
          )}
        </div>)}
      </section>
      <section aria-label="엔딩 수집">
        <h3>수집한 엔딩</h3>
        <p>수사 자료와 분리된 이 브라우저의 완료 기록입니다.</p>
        {profileView.endings.length === 0 ? <p>아직 완료한 엔딩이 없습니다.</p> : <ul>{profileView.endings.map(id => <li key={id}>{GAME_INDEX.scenes.get(id)!.title}{profileView.endingsError ? ' · 미저장' : ''}</li>)}</ul>}
        {profileView.endingsError && <p role="alert">엔딩 수집 미저장 — {SAVE_ERRORS[profileView.endingsError]}</p>}
        {[profileView.preferencesOriginal, profileView.endingsOriginal].filter(original => original !== null).map(original => <button className="continue-action" type="button" key={original.key} onClick={() => download(`${original.key}-original.json`, original.raw)}>보전 원본 내보내기 ({original.key.includes('preferences') ? '설정' : '엔딩 수집'})</button>)}
      </section>
      </div>
    </section>
  );
}
