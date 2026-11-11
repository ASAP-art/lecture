import { describe, expect, it } from 'vitest';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import { buildInvestigationSurface } from '../src/engine/investigation-view';
import { gameReducer } from '../src/engine/reducer';
import { createInitialState, serializeGameState, type RuntimeGameState } from '../src/engine/state';
import { advanceSession, completedSession, freshSession, prefixSession, selectSession } from './helpers/save-play';

const DEVELOPER_UTILITY_LABELS = [
  '현재값과 과거값 구분',
  '독립 원본이 있음을 알림',
  '알리바이와 작성자 특정',
  '관리자≠행위자',
  '서로 다른 네 명',
  '거짓 안전 확인의 귀속',
  '수동 살인설 반박',
  '지후가 잔류를 알았음',
  '단순 실수 설명 반박',
  '사후 설계의 단서',
  '살인의 불가피성 반박',
  '지후의 분노, 이경의 약점',
  '이경이 단절을 알고 있었다',
  '이경의 보호는 처음부터 침해',
  '은폐 목적과 다른 두 번째 진실',
];

describe('investigation surface disclosure and state immutability', () => {
  it('checks both acquisition and disclosure history before exposing evidence, timeline, roster, or character notes', () => {
    // At CH01 start: E01 is logically acquired, but BLK_CH01_S01_05 has not completed yet.
    const started = prefixSession(0);
    expect(started.game.evidence.has('E01')).toBe(true);
    expect(started.game.revealedEvidenceSections.has('ESECTION_E01_RECORD')).toBe(false);

    const beforeSnapshot = serializeGameState(started.game);
    const initialSurface = buildInvestigationSurface(started.game);
    expect(initialSurface.evidenceRecords).toHaveLength(0);
    expect(initialSurface.records).toHaveLength(0);
    expect(initialSurface.logs).toHaveLength(0);
    // Inspecting surface must never mutate state
    expect(serializeGameState(started.game)).toEqual(beforeSnapshot);

    // Selecting C01_A acquires E02 immediately, but ESECTION_E02_ENVELOPE only reveals after BLK_CH01_S01_A_05 completes
    const afterC01A = selectSession(started, 'C01_A');
    expect(afterC01A.game.evidence.has('E02')).toBe(true);
    expect(afterC01A.game.revealedEvidenceSections.has('ESECTION_E02_ENVELOPE')).toBe(false);

    const midSurface = buildInvestigationSurface(afterC01A.game);
    expect(midSurface.evidenceRecords.map((r) => r.title)).toEqual([
      '기계실 외함에 금속이 쓸린 흔적이 보였다.',
    ]);
    expect(midSurface.evidenceRecords.map((r) => r.title)).not.toContain(
      '‘19:41 / 원본 출력 / 봉인’',
    );

    // Even if someone tampers with revealedEvidenceSections without logical evidence acquisition, it is rejected
    const forgedRevealOnly: RuntimeGameState = {
      ...started.game,
      evidence: new Set(),
      revealedEvidenceSections: new Set(['ESECTION_E01_RECORD', 'ESECTION_E02_ENVELOPE']),
    };
    expect(buildInvestigationSurface(forgedRevealOnly).evidenceRecords).toHaveLength(0);

    // Even if someone has logical D1/D2/D3 without disclosed evidence/note, board keeps them unconfirmed
    const forgedDeductionOnly: RuntimeGameState = {
      ...started.game,
      deductions: new Set(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']),
    };
    const forgedBoard = buildInvestigationSurface(forgedDeductionOnly).board;
    expect(forgedBoard.every((axis) => axis.status === '미확인')).toBe(true);
  });

  it('keeps game state strictly immutable across repeated inspections of all tabs and completed runs', () => {
    const completed = completedSession();
    const snapshotBefore = serializeGameState(completed.game);

    const surface1 = buildInvestigationSurface(completed.game);
    const surface2 = buildInvestigationSurface(completed.game);

    expect(surface1).toEqual(surface2);
    expect(serializeGameState(completed.game)).toEqual(snapshotBefore);
    expect(surface1.board.map((a) => a.status)).toEqual(['확보', '확보', '확보', '확보', '확보', '확보']);
    expect(surface1.logs.length).toBe(completed.game.displayLog.length);
  });

  it('never exposes developer utility descriptions, internal IDs, proof/full, or hidden family evidence counts', () => {
    for (const count of [0, 3, 8, 12, 17, 20, 24]) {
      const session = prefixSession(count);
      const surface = buildInvestigationSurface(session.game);
      const serializedSurface = JSON.stringify(surface);

      for (const utility of DEVELOPER_UTILITY_LABELS) {
        expect(serializedSurface).not.toContain(utility);
      }
      expect(serializedSurface).not.toMatch(/\b(?:proof|full|insight|CHAR_[A-Z]+|ESECTION_[A-Z0-9_]+|NOTE_[A-Z0-9_]+|BLK_[A-Z0-9_]+|FX_[A-Z0-9_]+|VAR_[A-Z0-9_]+)\b/);
      expect(serializedSurface).not.toMatch(/숨은 증거|비밀 슬롯|미획득 증거/);
    }
  });

  it('records only actually completed blocks of the current run in the read-only log and resets on new run', () => {
    let session = prefixSession(0);
    expect(buildInvestigationSurface(session.game).logs).toHaveLength(0);

    session = advanceSession(session);
    const logsAfterOne = buildInvestigationSurface(session.game).logs;
    expect(logsAfterOne).toHaveLength(1);
    expect(logsAfterOne[0]!.text).toContain('지하로 내려가자 젖은 종이 냄새가 났다.');
    // Next typing block is not yet in the log
    expect(logsAfterOne.some((l) => l.text.includes('신고는 7시 41분'))).toBe(false);

    // Forced title reset clears log for the new run
    const resetState = gameReducer(session.game, {
      type: 'title',
      runId: 'RUN_RESET_TEST',
      seed: 42,
      force: true,
    });
    expect(buildInvestigationSurface(resetState).logs).toHaveLength(0);
    expect(resetState.evidence.size).toBe(0);
  });

  it('distinguishes confirmed vs candidate timeline entries based on E07 disclosure', () => {
    // Route without E07 reaching CH07_S02_A
    let withoutE07 = selectSession(prefixSession(8), 'C09_B');
    for (const choice of ['C10_A', 'C11_A', 'C12_A', 'C13_A', 'C14_B', 'C15_C', 'C16_A'] as const) {
      withoutE07 = selectSession(withoutE07, choice);
    }
    const candidateTimeline = buildInvestigationSurface(withoutE07.game).timeline;
    const moveEntry = candidateTimeline.find((item) => item.time === '19:40:00');
    const handEntry = candidateTimeline.find((item) => item.time === '19:46:02');
    expect(moveEntry?.status).toBe('후보');
    expect(handEntry?.status).toBe('후보');

    // Route with E07
    const withE07 = prefixSession(16);
    const confirmedTimeline = buildInvestigationSurface(withE07.game).timeline;
    expect(confirmedTimeline.find((item) => item.time === '19:40:00')?.status).toBe('확인');
    expect(confirmedTimeline.find((item) => item.time === '19:46:02')?.status).toBe('확인');
  });
});
