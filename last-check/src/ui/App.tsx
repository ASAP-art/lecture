import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { evaluateCondition } from '../content/conditions';
import { GAME_CONTENT, GAME_INDEX } from '../content/game-content';
import type { ChoiceId } from '../content/ids';
import { currentBlock, blockText, initializeContentFlags } from '../engine/gameplay';
import {
  buildInvestigationSurface,
  type NotebookTabId,
} from '../engine/investigation-view';
import { createSaveSession, saveSessionReducer, type SaveSession } from '../engine/save-session';
import { orderChoiceIds } from '../engine/selection-order';
import { createInitialState } from '../engine/state';
import { browserLocks, browserStorage, SAVE_ERRORS, SAVE_KEY, SaveRepository } from '../engine/storage';
import { ProfileRepository } from '../engine/profile-storage';
import { SavePanel, saveStatus } from './SavePanel';
import { StageArt } from './StageArt';
import { useMediaQuery, useReadingPreferences, TYPING_DELAYS } from './reading-preferences';
import { containDialogTab } from './dialog-focus';
import { StartMenu } from './StartMenu';
import { getDialogueReviewEntries } from './dialogue-review';

const characterIds = GAME_CONTENT.characters.map((character) => character.id);

const NOTEBOOK_TABS: ReadonlyArray<{ id: NotebookTabId; label: string }> = [
  { id: 'all', label: '전체 기록' },
  { id: 'evidence', label: '증거' },
  { id: 'statements', label: '진술' },
  { id: 'characters', label: '인물' },
  { id: 'timeline', label: '시간표' },
  { id: 'roster', label: '명단' },
  { id: 'board', label: '가설판' },
  { id: 'log', label: '로그' },
];

function createRunId(): string {
  return `RUN_${crypto.randomUUID().replaceAll('-', '_').toUpperCase()}`;
}

function createSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

function initialGameState(parentRunId: string | null = null) {
  return initializeContentFlags(
    createInitialState({
      runId: createRunId(),
      parentRunId,
      sceneId: GAME_CONTENT.chapters[0]!.entrySceneId,
      seed: createSeed(),
      characterIds,
    }),
    GAME_INDEX,
  );
}

export function App() {
  const [repository] = useState(() => new SaveRepository(browserStorage, browserLocks));
  const [profile] = useState(() => new ProfileRepository(browserStorage, browserLocks));
  const saveView = useSyncExternalStore(repository.subscribe, repository.getView);
  const profileView = useSyncExternalStore(profile.subscribe, profile.getView);
  const [session, dispatch] = useReducer(saveSessionReducer, undefined, () => repository.initialSession(initialGameState()));
  const state = session.game;
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const enqueuedSequence = useRef(0);
  const [typing, setTyping] = useState({ identity: '', count: 0 });
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notebookTab, setNotebookTab] = useState<NotebookTabId>('all');
  const typingTimer = useRef<number | null>(null);
  const saveToggleRef = useRef<HTMLButtonElement | null>(null);
  const notebookToggleRef = useRef<HTMLButtonElement | null>(null);
  const saveOpenerRef = useRef<HTMLButtonElement | null>(null);
  const notebookRef = useRef<HTMLElement | null>(null);
  const [focusReadingSettings, setFocusReadingSettings] = useState(false);
  const reading = useReadingPreferences();
  const compact = useMediaQuery('(max-width: 840px)');
  const systemReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const reducedMotion = systemReducedMotion || reading.preferences.reduceMotion;
  const [reviewCursor, setReviewCursor] = useState<{ identity: string; index: number } | null>(null);
  const [startMenuPage, setStartMenuPage] = useState<'menu' | 'introduction' | null>(() =>
    state.displayStage === 'scene' && state.sceneId === 'CH01_S01' && state.choiceHistory.length === 0 && state.displayLog.length === 0
      ? 'menu' : null);
  const startMenuOpen = startMenuPage !== null;
  const reviewEntries = useMemo(() => startMenuOpen ? [] : getDialogueReviewEntries(state), [state, startMenuOpen]);
  const reviewIdentity = `${state.runId}:${state.saveRevision}:${session.sequence}`;
  const reviewIndex = reviewCursor?.identity === reviewIdentity ? reviewCursor.index : -1;
  const reviewed = reviewIndex >= 0 ? reviewEntries[reviewIndex] : undefined;
  const reviewing = reviewed !== undefined;

  const scene = GAME_INDEX.scenes.get(state.sceneId);
  if (!scene) throw new Error(`현재 scene을 찾을 수 없습니다: ${state.sceneId}`);
  const chapter = GAME_CONTENT.chapters.find((item) => item.id === scene.chapterId)!;
  const block = currentBlock(state, GAME_INDEX);
  const text = block ? blockText(block, state) : '';
  const typingIdentity = `${state.runId}:${session.sequence}:${block?.id ?? ''}`;
  const visibleCharacters = typing.identity === typingIdentity ? typing.count : 0;
  const setVisibleCharacters = (count: number) => setTyping({ identity: typingIdentity, count });
  const typingComplete = visibleCharacters >= text.length;

  const availableChoices = useMemo(() => {
    const allowed = scene.choices;
    const orderedIds = orderChoiceIds(
      allowed.map((choice) => choice.id),
      state.seed,
      scene.id,
    );
    return orderedIds.map((id) => allowed.find((choice) => choice.id === id)!);
  }, [scene, state]);

  const surface = useMemo(() => buildInvestigationSurface(state), [state]);
  const notebookRecords = surface.records;

  const missingChainItems = [
    ['D1', '집합 불일치'], ['D2', '흔적의 선후'], ['D3', '문서 귀속'], ['D4', '고의'],
  ].filter(([id]) => !state.deductions.has(id!)).map(([, label]) => label!);
  if (!state.flags.FLAG_RESTORED) missingChainItems.push('알리바이의 적용 범위');

  useEffect(() => {
    if (session.sequence <= enqueuedSequence.current) return;
    enqueuedSequence.current = session.sequence;
    void repository.saveSession(session);
  }, [session, repository]);

  useEffect(() => {
    if (repository.getView().migration) void repository.migrate();
    const changed = (event: StorageEvent) => {
      if (event.key === SAVE_KEY || event.key === null) repository.checkExternalChange();
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [repository]);

  useEffect(() => {
    if (state.displayStage === 'complete' && scene.endCommand === 'TITLE') void profile.collectEnding(scene.id);
  }, [profile, state.runId, state.displayStage, scene.id, scene.endCommand]);

  useEffect(() => {
    if (!block || reviewing || startMenuOpen) return;
    if (reducedMotion || profileView.preferences.instantText) {
      setTyping({ identity: typingIdentity, count: text.length });
      return;
    }
    const timer = window.setInterval(() => {
      setTyping(current => {
        const count = current.identity === typingIdentity ? current.count : 0;
        const next = Math.min(count + 1, text.length);
        if (next >= text.length) {
          window.clearInterval(timer);
          if (typingTimer.current === timer) typingTimer.current = null;
        }
        return current.identity === typingIdentity && current.count === next ? current : { identity: typingIdentity, count: next };
      });
    }, TYPING_DELAYS[reading.preferences.typingSpeed]);
    typingTimer.current = timer;
    return () => {
      window.clearInterval(timer);
      if (typingTimer.current === timer) typingTimer.current = null;
    };
  }, [typingIdentity, text, block, profileView.preferences.instantText, reading.preferences.typingSpeed, reducedMotion, reviewing, startMenuOpen]);

  useEffect(() => {
    if (!notebookOpen) return;
    notebookRef.current?.querySelector<HTMLButtonElement>('.notebook-close')?.focus();
    if (!compact) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [notebookOpen, compact]);

  const closeSavePanel = (restoreFocus = true) => {
    setSaveOpen(false);
    setConfirmOpen(false);
    if (restoreFocus) window.setTimeout(() => (saveOpenerRef.current ?? saveToggleRef.current)?.focus(), 0);
  };

  const closeNotebook = () => {
    setNotebookOpen(false);
    window.setTimeout(() => notebookToggleRef.current?.focus(), 0);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (event.repeat && (event.key === ' ' || event.key === 'Enter') &&
          !target?.closest('input, select, textarea, [contenteditable="true"]')) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        if (confirmOpen) return;
        if (saveOpen) {
          event.preventDefault();
          closeSavePanel();
          return;
        }
        if (notebookOpen) {
          event.preventDefault();
          closeNotebook();
          return;
        }
      }
      if (confirmOpen || saveOpen || (notebookOpen && compact) || reviewing || startMenuOpen) return;
      if (target?.closest('#save-panel, .notebook, .site-header, button, input, select, textarea, a, [contenteditable="true"]')) {
        return;
      }
      if ((event.key === ' ' || event.key === 'Enter') && block) {
        event.preventDefault();
        if (!typingComplete) {
          if (typingTimer.current !== null) {
            window.clearInterval(typingTimer.current);
            typingTimer.current = null;
          }
          setVisibleCharacters(text.length);
        } else {
          dispatch({ type: 'continueBlock', blockId: block.id });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const modalOpen = saveOpen || confirmOpen || (notebookOpen && compact);

  const handleContinue = () => {
    if (modalOpen || reviewing || startMenuOpen) return;
    if (!typingComplete) {
      if (typingTimer.current !== null) {
        window.clearInterval(typingTimer.current);
        typingTimer.current = null;
      }
      setVisibleCharacters(text.length);
      return;
    }
    dispatch({ type: 'continueBlock', blockId: block!.id });
  };

  const handleChoice = (choiceId: ChoiceId) => {
    if (modalOpen || reviewing || startMenuOpen) return;
    dispatch({ type: 'choose', choiceId, sceneId: scene.id });
  };

  const handleStartNewGame = () => {
    closeSavePanel(false);
    setNotebookOpen(false);
    setReviewCursor(null);
    setStartMenuPage('introduction');
  };
  const startFromIntroduction = () => {
    setStartMenuPage(null);
    setReviewCursor(null);
    if (state.displayStage === 'scene' && state.sceneId === 'CH01_S01' && state.choiceHistory.length === 0 && state.displayLog.length === 0) {
      dispatch({ type: 'begin' });
      return;
    }
    const fresh = createSaveSession(
      { ...initialGameState(state.runId), saveRevision: 1 },
      { ...saveView.document.runs, ...session.runs },
    );
    dispatch({ type: 'restoreSession', session: saveSessionReducer(fresh, { type: 'begin' }) });
  };

  const handleReturnToTitle = () => {
    closeSavePanel(false);
    setNotebookOpen(false);
    setReviewCursor(null);
    setStartMenuPage('menu');
  };

  const canContinueFromTitle =
    saveView.pending === 0 &&
    saveView.error !== 'corrupt' &&
    saveView.error !== 'incompatible' &&
    (state.displayStage !== 'scene' || state.displayLog.length > 0 || state.choiceHistory.length > 0);

  const restoreSession = (loaded: SaveSession) => {
    setNotebookOpen(false);
    setConfirmOpen(false);
    setReviewCursor(null);
    setStartMenuPage(null);
    dispatch({ type: 'restoreSession', session: loaded });
  };
  const beginScene = () => {
    dispatch({ type: 'begin' });
  };
  const reviewPrevious = () => {
    if (modalOpen || reviewEntries.length === 0) return;
    setReviewCursor({ identity: reviewIdentity, index: reviewing ? Math.max(0, reviewIndex - 1) : reviewEntries.length - 1 });
  };

  const visibleRequiredBlocks = useMemo(
    () =>
      scene.blocks.filter(
        (item) => !item.condition || evaluateCondition(item.condition, state),
      ),
    [scene.blocks, state],
  );
  const allRequiredBlocksCompleted = useMemo(
    () => visibleRequiredBlocks.every((item) => state.revealedBlocks.has(item.id)),
    [visibleRequiredBlocks, state.revealedBlocks],
  );

  return (
    <main className="app-shell" data-text-size={reading.preferences.textSize} data-reduced-motion={reducedMotion || undefined}>
      <header className="site-header" inert={saveOpen || (notebookOpen && compact) || undefined} onClick={(event) => event.stopPropagation()}>
        <div>
          <h1>마지막 확인</h1>
          <p className="chapter-line">{startMenuOpen ? '진술과 기록을 대조하는 추리 게임' : scene.endCommand ? scene.title : `${chapter.id.replace('CH', 'CHAPTER ')} — ${chapter.title}`}</p>
        </div>
        <div className="header-actions">
          <span className="save-state" role="status" aria-label="저장 상태">{saveStatus(saveView, state)}</span>
          <button
            ref={saveToggleRef}
            className="notebook-toggle"
            type="button"
            aria-expanded={saveOpen}
            aria-controls="save-panel"
            onClick={(event) => {
              event.stopPropagation();
              if (saveOpen) {
                closeSavePanel();
              } else {
                saveOpenerRef.current = event.currentTarget;
                setFocusReadingSettings(false);
                setNotebookOpen(false);
                setSaveOpen(true);
              }
            }}
          >
            저장/불러오기
          </button>
          <button className="notebook-toggle" type="button" aria-controls="save-panel" onClick={event => {
            saveOpenerRef.current = event.currentTarget;
            setFocusReadingSettings(true);
            setNotebookOpen(false);
            setSaveOpen(true);
          }}>읽기 설정</button>
          <button
            ref={notebookToggleRef}
            className="notebook-toggle"
            type="button"
            aria-expanded={notebookOpen}
            aria-controls="investigation-notebook"
            onClick={(event) => {
              event.stopPropagation();
              if (notebookOpen) {
                closeNotebook();
              } else {
                setNotebookOpen(true);
              }
            }}
          >
            수첩 {notebookRecords.length}
          </button>
        </div>
      </header>

      {!saveOpen && saveView.error && (
        <section className="save-warning" role="alert" onClick={(event) => event.stopPropagation()}>
          <p>{SAVE_ERRORS[saveView.error]}</p>
          <button type="button" className="continue-action" onClick={(event) => { event.stopPropagation(); setSaveOpen(true); }}>
            저장 문제 확인
          </button>
        </section>
      )}
      {saveOpen && (
        <SavePanel
          session={session}
          repository={repository}
          view={saveView}
          profile={profile}
          profileView={profileView}
          createRunId={createRunId}
          createSeed={createSeed}
          restore={restoreSession}
          startNewGame={handleStartNewGame}
          returnToTitle={handleReturnToTitle}
          onClose={closeSavePanel}
          onConfirmOpenChange={setConfirmOpen}
          readingPreferences={reading.preferences}
          onReadingChange={reading.update}
          readingError={reading.error}
          focusReadingSettings={focusReadingSettings}
        />
      )}

      <div className={notebookOpen ? 'workspace notebook-visible' : 'workspace'}>
        <section className="play-stage" aria-label="게임 플레이 화면" inert={modalOpen || undefined} aria-hidden={modalOpen || undefined}>
          <StageArt state={state} title={startMenuOpen} />

          <div className="scene-strip">
            <span>{startMenuOpen ? '시작 메뉴' : `${scene.id}${scene.title ? ` — ${scene.title}` : ''}`}</span>
            {!startMenuOpen && block && <span>{state.blockCursor + 1} / {scene.blocks.length}</span>}
            {!startMenuOpen && scene.id === 'CH07_S03' && !state.evidence.has('E04') && (
              <span>화면 항목: 정의 미확인</span>
            )}
          </div>

          {!startMenuOpen && scene.blocks.some((item) => item.pinned && state.revealedBlocks.has(item.id)) && (
            <section className="pinned-documents" aria-label="대조 자료">
              {scene.blocks.filter((item) => item.pinned && state.revealedBlocks.has(item.id)).map((item) => (
                <p key={item.id} data-pinned-block={item.id}>
                  {blockText(item, state)}
                  {item.confirmationCondition && (
                    <strong data-confirmed={evaluateCondition(item.confirmationCondition, state)}>
                      {evaluateCondition(item.confirmationCondition, state)
                        ? '원본 이력 확인'
                        : '설비 설명상의 확인 후보'}
                    </strong>
                  )}
                </p>
              ))}
            </section>
          )}
          {!startMenuOpen && scene.id === 'CH08_S01' && (
            <section className="pinned-documents" aria-label="재확인 통화">
              {state.evidence.has('E10') && surface.evidenceRecords.some((r) => r.title === '19:39 태오를 특정한 안전 재확인 통화')
                ? <p>{surface.evidenceRecords.find((r) => r.title === '19:39 태오를 특정한 안전 재확인 통화')?.body}</p>
                : <p>미청취</p>}
            </section>
          )}
          {!startMenuOpen && scene.id === 'CH08_S03_A' && !state.flags.FLAG_FINAL_CHAIN &&
            state.revealedBlocks.has(scene.blocks[0]!.id) && missingChainItems.length > 0 && (
              <section className="pinned-documents" aria-label="미완성 논증">
                {missingChainItems.map((item) => <p key={item}>{item}</p>)}
              </section>
            )}
          <section
            className="dialogue-panel"
            aria-label="대사와 서술"
            onClick={(event) => {
              if (saveOpen || confirmOpen || !block) return;
              const target = event.target as HTMLElement;
              if (target.closest('button')) return;
              if (window.getSelection()?.toString()) return;
              handleContinue();
            }}
          >
            {startMenuOpen ? <StartMenu
              key={`${state.runId}:${startMenuPage}`}
              initialPage={startMenuPage}
              disabled={modalOpen}
              canContinue={canContinueFromTitle}
              onStart={startFromIntroduction}
              onContinue={() => setStartMenuPage(null)}
            /> : state.displayStage === 'scene' && (
              <button className="primary-action" type="button" disabled={modalOpen} onClick={beginScene}>이 장면 시작</button>
            )}

            {!startMenuOpen && reviewed && <>
              <p className="dialogue-review-note" role="status">이전 대사 {reviewIndex + 1} / {reviewEntries.length} · 진행과 그림은 현재 위치에 유지됩니다.</p>
              <p className={`story-block story-${reviewed.kind}`} data-review-block-id={reviewed.blockId}>{reviewed.text}</p>
            </>}
            {!startMenuOpen && block && !reviewing && (
              <>
                <p
                  className={`story-block story-${block.kind}`}
                  data-block-id={block.id}
                >
                  <span className="sr-only">{text}</span>
                  <span aria-hidden="true">{text.slice(0, visibleCharacters)}</span>
                  {!typingComplete && <span className="typing-caret" aria-hidden="true" />}
                </p>
              </>
            )}

            {!startMenuOpen && state.displayStage !== 'scene' && <div className="dialogue-controls" onClick={event => event.stopPropagation()}>
              <div className="dialogue-history-actions" aria-label="읽은 대사 이동">
                <button className="continue-action secondary-action" type="button"
                  disabled={modalOpen || reviewEntries.length === 0 || (reviewing && reviewIndex === 0)}
                  onClick={reviewPrevious}>이전 대사</button>
                {reviewing && <>
                  <button className="continue-action secondary-action" type="button"
                    disabled={modalOpen || reviewIndex >= reviewEntries.length - 1}
                    onClick={() => setReviewCursor({ identity: reviewIdentity, index: reviewIndex + 1 })}>다음 대사</button>
                  <button className="continue-action secondary-action" type="button" disabled={modalOpen}
                    onClick={() => setReviewCursor(null)}>현재로 돌아가기</button>
                </>}
              </div>
              {block && !reviewing && <button className="continue-action advance-action" type="button" disabled={modalOpen} onClick={handleContinue}>
                {typingComplete ? '계속' : '현재 문장 모두 표시'}
              </button>}
            </div>}

            {!startMenuOpen && !reviewing && state.displayStage === 'choice' && allRequiredBlocksCompleted && (
              <div className="choice-state" aria-labelledby="choice-heading">
                <h2 id="choice-heading">선택:</h2>
                <div className="choice-list">
                  {availableChoices.map((choice) => (
                    <button
                      key={choice.id}
                      className="choice-action"
                      data-choice-id={choice.id}
                      type="button"
                      onClick={() => handleChoice(choice.id)}
                      disabled={modalOpen || (!!choice.condition && !evaluateCondition(choice.condition, state))}
                    >
                      {choice.label.replace(/ \[[^\]]+\]$/, '')}
                      {choice.condition && !evaluateCondition(choice.condition, state) && (
                        <span className="choice-unavailable">{choice.disabledReason ?? '당사자 동의 미확보'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!startMenuOpen && !reviewing && state.displayStage === 'complete' && (
              <div className="complete-state" role="status">
                <h2>{scene.title}</h2>
                {scene.blocks.at(-1)?.kind === 'closingLine' &&
                  state.revealedBlocks.has(scene.blocks.at(-1)!.id) && (
                    <p>{blockText(scene.blocks.at(-1)!, state)}</p>
                  )}
                {state.blockedNextSceneId && GAME_INDEX.scenes.has(state.blockedNextSceneId) && (
                  <button className="primary-action" type="button" disabled={modalOpen} onClick={() =>
                    dispatch({ type: 'continueBlock', blockId: null })
                  }>
                    다음 장면 계속
                  </button>
                )}
                {scene.endCommand === 'TITLE' && (
                  <button className="primary-action" type="button" disabled={modalOpen} onClick={() => {
                    setNotebookOpen(false);
                    setStartMenuPage('menu');
                    dispatch({ type: 'title', runId: createRunId(), seed: createSeed() });
                  }}>
                    타이틀로
                  </button>
                )}
              </div>
            )}
          </section>
        </section>

        {notebookOpen && (
          <aside
            className="notebook"
            id="investigation-notebook"
            aria-label="수첩"
            ref={notebookRef}
            role={compact ? 'dialog' : undefined}
            aria-modal={compact || undefined}
            inert={saveOpen || undefined}
            onKeyDown={event => { if (compact) containDialogTab(event, notebookRef.current); }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notebook-heading">
              <h2>수첩</h2>
              <div className="notebook-heading-meta">
                <span>공개된 기록 {notebookRecords.length}</span>
                <button type="button" className="notebook-close" onClick={closeNotebook}>
                  닫기
                </button>
              </div>
            </div>

            <div className="notebook-tabs" role="tablist" aria-label="수첩 분류">
              {NOTEBOOK_TABS.map((tab) => (
                <button
                  id={`notebook-tab-${tab.id}`}
                  tabIndex={notebookTab === tab.id ? 0 : -1}
                  aria-controls="notebook-content"
                  onKeyDown={event => {
                    const index = NOTEBOOK_TABS.findIndex(item => item.id === tab.id);
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? NOTEBOOK_TABS.length - 1 :
                      event.key === 'ArrowRight' ? (index + 1) % NOTEBOOK_TABS.length :
                      event.key === 'ArrowLeft' ? (index + NOTEBOOK_TABS.length - 1) % NOTEBOOK_TABS.length : null;
                    if (next === null) return;
                    event.preventDefault();
                    const target = NOTEBOOK_TABS[next]!;
                    setNotebookTab(target.id);
                    document.getElementById(`notebook-tab-${target.id}`)?.focus();
                  }}
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={notebookTab === tab.id ? 'notebook-tab active' : 'notebook-tab'}
                  aria-selected={notebookTab === tab.id}
                  onClick={() => setNotebookTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div id="notebook-content" role="tabpanel" aria-labelledby={`notebook-tab-${notebookTab}`} tabIndex={0}>
            {notebookTab === 'all' && (
              notebookRecords.length === 0 ? (
                <p className="notebook-empty">아직 공개된 기록이 없습니다.</p>
              ) : (
                <ol className="notebook-list">
                  {notebookRecords.map((record) => (
                    <li key={record.key}>
                      <h3>{record.title}</h3>
                      <p>{record.body}</p>
                    </li>
                  ))}
                </ol>
              )
            )}

            {notebookTab === 'evidence' && (
              surface.evidenceRecords.length === 0 ? (
                <p className="notebook-empty">아직 공개된 증거 기록이 없습니다.</p>
              ) : (
                <ol className="notebook-list">
                  {surface.evidenceRecords.map((record) => (
                    <li key={record.key}>
                      <h3>{record.title}</h3>
                      <p>{record.body}</p>
                    </li>
                  ))}
                </ol>
              )
            )}

            {notebookTab === 'statements' && (
              surface.statementRecords.length === 0 ? (
                <p className="notebook-empty">아직 보존된 진술 기록이 없습니다.</p>
              ) : (
                <ol className="notebook-list">
                  {surface.statementRecords.map((record) => (
                    <li key={record.key}>
                      <h3>{record.title}</h3>
                      <p>{record.body}</p>
                    </li>
                  ))}
                </ol>
              )
            )}

            {notebookTab === 'characters' && (
              <ul className="notebook-list character-list">
                {surface.characters.map((person) => (
                  <li key={person.name}>
                    <h3>{person.name}</h3>
                    <p className="character-role">{person.role}</p>
                    {person.details.map((detail, idx) => (
                      <p key={idx}>{detail}</p>
                    ))}
                  </li>
                ))}
              </ul>
            )}

            {notebookTab === 'timeline' && (
              surface.timeline.length === 0 ? (
                <p className="notebook-empty">아직 확인된 시간표 기록이 없습니다.</p>
              ) : (
                <ol className="notebook-list timeline-list">
                  {surface.timeline.map((item, idx) => (
                    <li key={`${item.time}-${idx}`}>
                      <div className="timeline-header">
                        <h3>{item.time}</h3>
                        <span
                          className="timeline-badge"
                          data-timeline-confirmed={item.confirmed === null ? 'unknown' : String(item.confirmed)}
                        >
                          {item.status === '확인' ? '원본 확인' : item.status === '후보' ? '설비 설명상의 확인 후보' : '미확인'}
                        </span>
                      </div>
                      <p>{item.summary}</p>
                    </li>
                  ))}
                </ol>
              )
            )}

            {notebookTab === 'roster' && (
              surface.roster.documents.length === 0 && surface.roster.notes.length === 0 ? (
                <p className="notebook-empty">아직 열람한 명단이나 출입 기록이 없습니다.</p>
              ) : (
                <div className="roster-view">
                  {surface.roster.documents.length > 0 && (
                    <ul className="notebook-list">
                      {surface.roster.documents.map((doc) => (
                        <li key={doc.label}>
                          <h3>{doc.label}</h3>
                          <p>{doc.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {surface.roster.notes.length > 0 && (
                    <div className="roster-notes">
                      <h3>대조 정리</h3>
                      {surface.roster.notes.map((note, idx) => (
                        <p key={idx}>{note}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {notebookTab === 'board' && (
              <div className="board-view">
                <p className="board-notice">
                  가설판은 현재까지 실제 열람해 확보한 자료와 미확인 구분만 표시합니다.
                </p>
                <ol className="notebook-list board-list">
                  {surface.board.map((axis) => (
                    <li key={axis.order}>
                      <div className="board-header">
                        <h3>{axis.order} {axis.title}</h3>
                        <span className="board-status" data-board-status={axis.status}>
                          {axis.status}
                        </span>
                      </div>
                      <p>{axis.summary}</p>
                      {axis.grounds.length > 0 && (
                        <ul className="board-grounds">
                          {axis.grounds.map((ground, idx) => (
                            <li key={idx}>{ground}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {notebookTab === 'log' && (
              surface.logs.length === 0 ? (
                <p className="notebook-empty">아직 현재 실행에서 표시 완료된 본문 로그가 없습니다.</p>
              ) : (
                <ol className="notebook-list log-list">
                  {surface.logs.map((entry) => (
                    <li key={entry.index}>
                      <div className="log-meta">
                        <span>#{entry.index}</span>
                        <span>{entry.chapterTitle}{entry.sceneTitle ? ` · ${entry.sceneTitle}` : ''}</span>
                      </div>
                      <p>{entry.text}</p>
                    </li>
                  ))}
                </ol>
              )
            )}
            </div>
          </aside>
        )}
      </div>

      <footer className="scope-note">
        기능 범위: CH01–CH10 · 엔딩 4개 · 미술: 제공 자산 22종 적용 · 사람 플레이테스트/배포: 미완료
      </footer>
    </main>
  );
}
