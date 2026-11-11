import { GAME_CONTENT, GAME_INDEX } from '../content/game-content';
import { evaluateCondition } from '../content/conditions';
import { blockText } from './gameplay';
import type { RuntimeGameState } from './state';

export type NotebookTabId =
  | 'all'
  | 'evidence'
  | 'statements'
  | 'characters'
  | 'timeline'
  | 'roster'
  | 'board'
  | 'log';

export interface DisclosedRecordView {
  readonly key: string;
  readonly kind: 'evidence' | 'statement';
  readonly title: string;
  readonly body: string;
}

export interface CharacterNoteView {
  readonly name: string;
  readonly role: string;
  readonly details: readonly string[];
}

export interface TimelineEntryView {
  readonly time: string;
  readonly summary: string;
  readonly status: '확인' | '후보' | '미확인';
  readonly confirmed: boolean | null;
}

export interface RosterDocumentView {
  readonly label: string;
  readonly text: string;
}

export interface RosterSummaryView {
  readonly documents: readonly RosterDocumentView[];
  readonly notes: readonly string[];
}

export interface HypothesisAxisView {
  readonly order: string;
  readonly title: string;
  readonly status: '확보' | '미확인';
  readonly summary: string;
  readonly grounds: readonly string[];
}

export interface LogEntryView {
  readonly index: number;
  readonly chapterTitle: string;
  readonly sceneTitle: string;
  readonly text: string;
}

export interface InvestigationSurfaceView {
  readonly records: readonly DisclosedRecordView[];
  readonly evidenceRecords: readonly DisclosedRecordView[];
  readonly statementRecords: readonly DisclosedRecordView[];
  readonly characters: readonly CharacterNoteView[];
  readonly timeline: readonly TimelineEntryView[];
  readonly roster: RosterSummaryView;
  readonly board: readonly HypothesisAxisView[];
  readonly logs: readonly LogEntryView[];
}

const stripChapterDuration = (title: string): string => title.replace(/〔[^〕]+〕$/u, '');

function hasDisclosedEvidence(state: RuntimeGameState, evidenceId: string, sectionId?: string): boolean {
  if (!state.evidence.has(evidenceId as never)) return false;
  if (sectionId) return state.revealedEvidenceSections.has(sectionId as never);
  const definition = GAME_INDEX.evidence.get(evidenceId);
  if (!definition) return false;
  return definition.sectionIds.some((id) => state.revealedEvidenceSections.has(id));
}

function hasDisclosedBlock(state: RuntimeGameState, blockId: string): boolean {
  return state.revealedBlocks.has(blockId as never);
}

function hasDisclosedNote(state: RuntimeGameState, entryId: string): boolean {
  return state.revealedNotebookEntries.has(entryId as never);
}

function hasDisclosedDeduction(
  state: RuntimeGameState,
  deductionId: string,
  requiredEvidenceIds: readonly string[],
  noteId: string,
): boolean {
  return (
    state.deductions.has(deductionId as never) &&
    requiredEvidenceIds.every((id) => hasDisclosedEvidence(state, id)) &&
    hasDisclosedNote(state, noteId)
  );
}

export function buildDisclosedEvidenceRecords(state: RuntimeGameState): DisclosedRecordView[] {
  return GAME_CONTENT.evidenceSections
    .filter(
      (section) =>
        state.evidence.has(section.evidenceId) &&
        state.revealedEvidenceSections.has(section.id),
    )
    .map((section, index) => ({
      key: `ev-${index}`,
      kind: 'evidence',
      title: section.title,
      body: section.body,
    }));
}

export function buildDisclosedStatementRecords(state: RuntimeGameState): DisclosedRecordView[] {
  return GAME_CONTENT.notebookEntries
    .filter((entry) => state.revealedNotebookEntries.has(entry.id))
    .map((entry, index) => ({
      key: `st-${index}`,
      kind: 'statement',
      title: entry.title,
      body: entry.body,
    }));
}

export function buildCharacterViews(state: RuntimeGameState): CharacterNoteView[] {
  const list: CharacterNoteView[] = [
    {
      name: '윤서진',
      role: '관할 강력팀 당직 형사',
      details: ['사망 신고 뒤 사고·범죄 가능성을 확인하기 위해 현장에 출동했다.'],
    },
  ];

  if (hasDisclosedBlock(state, 'BLK_CH01_S01_02')) {
    const details = ['기록·증거 확보와 현장 대조를 맡은 동료 형사.'];
    if (hasDisclosedBlock(state, 'BLK_CH01_S01_04')) {
      details.push('기계 기록상 19:40 이동 이후 비상 정지 상태를 보고했다.');
    }
    list.push({ name: '박도현', role: '동료 형사 · 기록·증거 담당', details });
  }

  if (hasDisclosedBlock(state, 'BLK_CH01_S01_02')) {
    const details = ['이음기록원 원장. 지하 수장고 이동식 서가 사고 사망자.'];
    if (hasDisclosedEvidence(state, 'E13', 'ESECTION_E13_COMMON')) {
      details.push('당일 오후 예전 기록 묶음 정리·폐기를 암시하는 메시지를 보냈다.');
    }
    if (hasDisclosedEvidence(state, 'E09', 'ESECTION_E09_COMMON')) {
      details.push('19:35 A3 단독 대조 대기 요청에 확인 회신을 남기고 19:39:05 A3 고정 내선으로 통화했다.');
    }
    list.push({ name: '강태오', role: '피해자 · 이음기록원장', details });
  }

  if (hasDisclosedBlock(state, 'BLK_CH01_S01_05') || hasDisclosedBlock(state, 'BLK_CH01_S02_01')) {
    const details: string[] = [];
    if (hasDisclosedBlock(state, 'BLK_CH01_S01_05')) {
      details.push('현장 모니터에 등록 관리자로 표시되어 있다.');
    }
    if (hasDisclosedBlock(state, 'BLK_CH01_S02_04')) {
      details.push('당일 서비스용 열쇠를 사용했다고 진술했다.');
    }
    if (hasDisclosedNote(state, 'NOTE_CH01_C02_A_STATEMENT')) {
      details.push('19:37경 점검 서명을 위해 기계실에 갔고 다시 간 적도 있다고 진술했다.');
    }
    if (hasDisclosedBlock(state, 'BLK_CH04_S02_02')) {
      details.push('자신이 열쇠를 써서 서가를 움직였다고 주장했다.');
    }
    if (hasDisclosedEvidence(state, 'E11')) {
      details.push('19:44 경비실에 자동 기록이 종이로 출력되는지 문의했다.');
    }
    if (hasDisclosedEvidence(state, 'E15', 'ESECTION_E15_PRIVATE_03')) {
      details.push('25년 전 입원 중이던 친모의 양육 포기 서류 작성과 관련된 기록이 확인되었다.');
    }
    if (hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_03')) {
      details.push('당일 17:10 지후의 고발 진술 초안 사본을 전달받고 수령 서명을 남겼다.');
    }
    if (hasDisclosedEvidence(state, 'E16', 'ESECTION_E16_05')) {
      details.push('원본 전달과 지후의 직접 진술, 재산 및 별도 변호 비용 정리를 메모에 남겼다.');
    }
    list.push({ name: '한이경', role: '기록감정 자문 · 서가 관리책임자', details });
  }

  if (hasDisclosedBlock(state, 'BLK_CH01_S02_10') || hasDisclosedEvidence(state, 'E03')) {
    const details: string[] = [];
    if (hasDisclosedBlock(state, 'BLK_CH01_S02_10')) {
      details.push('사건 시각에 안전실에 계속 있었다고 진술했다.');
    }
    if (hasDisclosedEvidence(state, 'E03', 'ESECTION_E03_VIDEO')) {
      details.push('19:30~19:45 안전실 연속 영상과 출입 기록이 확인되었다.');
    }
    if (hasDisclosedEvidence(state, 'E06', 'ESECTION_E06_CONFIRMATION')) {
      details.push('안전 확인서(확인 대상 4명 / 퇴실 완료 4명 / 잔류 0명) 작성자로 서명했다.');
    }
    if (hasDisclosedEvidence(state, 'E09', 'ESECTION_E09_COMMON')) {
      details.push('19:35 태오의 A3 대기 회신을 열람하고 19:39:05 내선 통화에 응답했다.');
    }
    if (hasDisclosedEvidence(state, 'E10')) {
      details.push('19:39:10 원장 잔류 여부를 묻는 재확인 통화에 안에 아무도 없다고 답했다.');
    }
    if (hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_02')) {
      details.push('사흘 전 한이경의 과거 서류 위조를 진술하겠다는 자필 초안을 작성했다.');
    }
    list.push({ name: '정지후', role: '계약직 아키비스트 · 안전실 확인 담당', details });
  }

  if (hasDisclosedBlock(state, 'BLK_CH01_S01_08')) {
    const details = ['19:41 신고 직후 나온 최초 원본 출력물을 봉인해 보관했다.'];
    if (hasDisclosedEvidence(state, 'E02', 'ESECTION_E02_ENVELOPE')) {
      details.push('봉투에 사건번호와 서명을 남기고 분석실 인계 전까지 책상에 보관했다.');
    }
    if (hasDisclosedEvidence(state, 'E06', 'ESECTION_E06_CONFIRMATION')) {
      details.push('안전실 확인서에 접수 도장을 찍었으나 현장 내부를 직접 확인한 것은 아니라고 진술했다.');
    }
    if (hasDisclosedEvidence(state, 'E10')) {
      details.push('19:39:10 안전실에 강 원장의 A3 잔류 여부를 특정해 다시 물었다.');
    }
    list.push({ name: '배수현', role: '경비 · 서류 수신 담당', details });
  }

  if (hasDisclosedBlock(state, 'BLK_CH02_S02_01')) {
    const details = ['이동식 서가의 예약 마감(19:40)과 현장 수동 운전 구조를 설명했다.'];
    if (hasDisclosedBlock(state, 'BLK_CH02_S02_10')) {
      details.push('A3 고정 전화 자리에서 위험 구역 출구까지 최소 90초, 안전실 왕복은 최소 7분이 걸린다고 설명했다.');
    }
    if (hasDisclosedEvidence(state, 'E04')) {
      details.push('화면의 관리자 항목은 고정 등록값이며 실제 작동과 선택 변경은 독립 이력에 기록된다고 설명했다.');
    }
    list.push({ name: '오준석', role: '설비 담당 기사', details });
  }

  if (hasDisclosedBlock(state, 'BLK_CH03_S01_04') || hasDisclosedBlock(state, 'BLK_CH03_S02_02')) {
    const details: string[] = [];
    if (hasDisclosedBlock(state, 'BLK_CH03_S01_04')) {
      details.push('19:38 안전실에 들러 지후에게 질문하고 서류를 건네받았다.');
    }
    if (hasDisclosedBlock(state, 'BLK_CH03_S03_04')) {
      details.push('당사자 명단 노출을 막기 위해 처음 방문했다는 부분을 거짓말했다고 인정했다.');
    }
    if (hasDisclosedEvidence(state, 'E12', 'ESECTION_E12_PRIVATE_01')) {
      details.push('사건 전날 친모 관련 원본 일부를 이미 전달받아 보관하고 있었다.');
    }
    if (hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_03')) {
      details.push('당일 17:10 지후의 진술 초안 사본을 이경에게 전달하고 수령 서명을 받았다.');
    }
    list.push({ name: '최은서', role: '민간 기록지원단체 조사원 · 방문객', details });
  }

  return list;
}

export function buildTimelineEntries(state: RuntimeGameState): TimelineEntryView[] {
  const entries: TimelineEntryView[] = [];
  const e07Disclosed = hasDisclosedEvidence(state, 'E07');
  const ch07TimelinePinned = hasDisclosedBlock(state, 'BLK_CH07_S02_02');

  if (hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_01')) {
    entries.push({
      time: '사흘 전',
      summary: '정지후가 과거 서류 위조에 관한 자필 진술 초안을 작성해 최은서에게 맡김',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_03') || hasDisclosedBlock(state, 'BLK_CH09_S01_02')) {
    entries.push({
      time: '17:10',
      summary: hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_03')
        ? '최은서가 한이경에게 진술 초안 사본을 전달하고 수령 서명을 받음'
        : '최은서가 사건 전 한이경에게 문서를 전달했다고 진술함',
      status: hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_03') ? '확인' : '후보',
      confirmed: hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_03'),
    });
  }
  if (hasDisclosedEvidence(state, 'E13', 'ESECTION_E13_COMMON')) {
    entries.push({
      time: '오후',
      summary: '강태오가 당일 마감 때 예전 기록 묶음을 정리한다는 메시지를 보냄 (지후 열람 표시)',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E03', 'ESECTION_E03_VIDEO')) {
    entries.push({
      time: '19:30~19:45',
      summary: '안전실 고정 카메라 연속 영상에 정지후가 자리를 비우지 않고 기록됨',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER')) {
    entries.push({
      time: '19:32',
      summary: '태그 원본: 정지후 안전실 입실 (퇴실 태그 아님)',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E09', 'ESECTION_E09_COMMON')) {
    entries.push({
      time: '19:35',
      summary: '정지후의 ‘19:40 마감 보류·A3 19:41까지 대기’ 문서에 강태오 회신 및 안전실 단말 열람',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER')) {
    entries.push({
      time: '19:36',
      summary: '위험 구역 확인 대상 명부 확정: 강태오 / 한이경 / 최은서 / 오준석',
      status: '확인',
      confirmed: true,
    });
  }
  if (e07Disclosed || ch07TimelinePinned || hasDisclosedNote(state, 'NOTE_CH01_C02_A_STATEMENT') || hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER')) {
    if (e07Disclosed || ch07TimelinePinned) {
      entries.push({
        time: '19:37:20',
        summary: '점검 종료, AUTO 복귀 (한이경 위험 구역 퇴실)',
        status: e07Disclosed ? '확인' : '후보',
        confirmed: e07Disclosed,
      });
    } else if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER')) {
      entries.push({
        time: '19:37',
        summary: '태그 원본: 한이경 위험 구역 퇴실',
        status: '확인',
        confirmed: true,
      });
    } else {
      entries.push({
        time: '19:37경',
        summary: '한이경이 점검 서명을 위해 서비스 열쇠를 썼다고 진술함',
        status: '후보',
        confirmed: false,
      });
    }
  }
  if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER')) {
    entries.push({
      time: '19:38',
      summary: '태그 원본: 최은서·오준석 위험 구역 퇴실 (안전실 대면 확인)',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E09', 'ESECTION_E09_COMMON')) {
    entries.push({
      time: '19:39:05',
      summary: 'A3 고정 내선 통화: 강태오가 A3 안이라고 말하자 정지후가 그대로 대기하라고 응답함',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E10')) {
    entries.push({
      time: '19:39:10',
      summary: '경비 재확인 통화: 배수현이 강 원장 잔류 여부를 묻자 정지후가 안에 아무도 없다고 응답함',
      status: '확인',
      confirmed: true,
    });
  } else if (hasDisclosedBlock(state, 'BLK_CH06_S02_04') || hasDisclosedBlock(state, 'BLK_CH08_S01_04')) {
    entries.push({
      time: '19:39',
      summary: '경비실과 안전실 사이의 재확인 통화 기록 (미청취)',
      status: '미확인',
      confirmed: null,
    });
  }
  if (hasDisclosedEvidence(state, 'E06', 'ESECTION_E06_CONFIRMATION') || hasDisclosedBlock(state, 'BLK_CH07_S02_03')) {
    entries.push({
      time: '19:39:30',
      summary: '정지후 전원 퇴실 확인서 서명 및 경비실 배수현 접수',
      status: '확인',
      confirmed: true,
    });
  }
  if (e07Disclosed || hasDisclosedBlock(state, 'BLK_CH07_S02_04') || hasDisclosedBlock(state, 'BLK_CH01_S01_04')) {
    entries.push({
      time: '19:40:00',
      summary: e07Disclosed
        ? '독립 이력: 예약 이동 (유일한 치명적 이동)'
        : hasDisclosedBlock(state, 'BLK_CH07_S02_04')
          ? '유일한 치명적 이동 (설비 설명상의 확인 후보)'
          : '기계 기록상 서가 이동 및 비상 정지 (수동·예약 분석 전)',
      status: e07Disclosed ? '확인' : '후보',
      confirmed: e07Disclosed,
    });
  }
  if (hasDisclosedBlock(state, 'BLK_CH01_S01_02') || hasDisclosedEvidence(state, 'E02', 'ESECTION_E02_ENVELOPE')) {
    entries.push({
      time: '19:41',
      summary: '비상 정지·신고 및 경비실 최초 원본 출력 봉인',
      status: '확인',
      confirmed: true,
    });
  }
  if (hasDisclosedEvidence(state, 'E11') || hasDisclosedBlock(state, 'BLK_CH02_S01_07')) {
    entries.push({
      time: '19:44',
      summary: '한이경이 경비실에 자동 기록이 종이로 출력되는지 문의함',
      status: hasDisclosedEvidence(state, 'E11') ? '확인' : '후보',
      confirmed: hasDisclosedEvidence(state, 'E11'),
    });
  }
  if (e07Disclosed || hasDisclosedBlock(state, 'BLK_CH07_S02_06')) {
    entries.push({
      time: '19:46:02',
      summary: e07Disclosed
        ? '독립 이력: HAND 변경, 이동 신호 없음'
        : '현재의 HAND 상태로 변경 (설비 설명상의 확인 후보)',
      status: e07Disclosed ? '확인' : '후보',
      confirmed: e07Disclosed,
    });
  }
  if (hasDisclosedEvidence(state, 'E01', 'ESECTION_E01_RECORD')) {
    entries.push({
      time: '현장 확인',
      summary: '기계실 외함에 금속이 쓸린 흔적, 선택창 HAND, 모니터 ‘관리자: 한이경’ 표시',
      status: '확인',
      confirmed: true,
    });
  }

  return entries;
}

export function buildRosterSummary(state: RuntimeGameState): RosterSummaryView {
  const documents: RosterDocumentView[] = [];
  const notes: string[] = [];

  if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER') || hasDisclosedBlock(state, 'BLK_CH03_S02_02')) {
    documents.push({
      label: '대상 명부 (19:36)',
      text: '강태오 / 한이경 / 최은서 / 오준석',
    });
  }
  if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER') || hasDisclosedBlock(state, 'BLK_CH03_S02_03')) {
    documents.push({
      label: '출입 태그 원본',
      text: '19:32 정지후 안전실 입실 / 19:37 한이경 위험 구역 퇴실 / 19:38 최은서 위험 구역 퇴실 / 19:38 오준석 위험 구역 퇴실',
    });
  }
  if (hasDisclosedEvidence(state, 'E06', 'ESECTION_E06_CONFIRMATION') || hasDisclosedBlock(state, 'BLK_CH04_S01_01')) {
    documents.push({
      label: '안전 확인서 (19:39:30)',
      text: '확인 대상 4명 / 퇴실 완료 4명 / 잔류 0명 — 작성 서명: 정지후 / 접수 날인: 배수현',
    });
  }
  if (hasDisclosedBlock(state, 'BLK_CH05_S03_02')) {
    documents.push({
      label: '수첩 대조 1 — 확인해야 할 사람',
      text: '태오 / 이경 / 은서 / 준석',
    });
  }
  if (hasDisclosedBlock(state, 'BLK_CH05_S03_03')) {
    documents.push({
      label: '수첩 대조 2 — 안전실에 있던 사람',
      text: '지후 / 이경 / 은서 / 준석',
    });
  }

  if (hasDisclosedDeduction(state, 'D1', ['E05', 'E06'], 'NOTE_CH05_S03_A')) {
    notes.push('이경·은서·준석은 양쪽에 있고 남는 것은 태오와 지후다. 지후의 안전실 입실을 태오의 퇴실로 세면 합계 숫자 4만 같아진다.');
  } else if (hasDisclosedNote(state, 'NOTE_CH05_S03_B')) {
    notes.push('서로 다른 명단 두 장이 구분되지 않은 채 남았다.');
  }

  if (hasDisclosedDeduction(state, 'D3', ['E04', 'E06'], 'NOTE_CH07_S03_A_HAS_E04')) {
    notes.push('한이경은 장비 등록 책임자, 정지후는 확인서 내용 작성자, 배수현은 서류 수신자로 역할이 분리된다.');
  } else if (hasDisclosedNote(state, 'NOTE_CH07_S03_A_MISSING_E04') || hasDisclosedNote(state, 'NOTE_CH07_S03_B')) {
    notes.push('화면 관리자 항목과 실제 확인서 작성자의 책임 범위가 아직 확정 분리되지 않았다.');
  }

  return { documents, notes };
}

export function buildHypothesisBoard(state: RuntimeGameState): HypothesisAxisView[] {
  const d1Confirmed = hasDisclosedDeduction(state, 'D1', ['E05', 'E06'], 'NOTE_CH05_S03_A');
  const d2Confirmed = hasDisclosedDeduction(state, 'D2', ['E07'], 'NOTE_CH07_S02_A_HAS_E07');
  const d3Confirmed = hasDisclosedDeduction(state, 'D3', ['E04', 'E06'], 'NOTE_CH07_S03_A_HAS_E04');
  const d4Confirmed = hasDisclosedDeduction(state, 'D4', ['E09', 'E10'], 'NOTE_CH08_S01_A_COMPLETE');
  const scopeConfirmed = state.flags.FLAG_RESTORED === true && hasDisclosedNote(state, 'NOTE_CH08_S02_A');
  const d5Confirmed =
    state.deductions.has('D5') &&
    state.flags.FLAG_FINAL_CHAIN === true &&
    hasDisclosedNote(state, 'NOTE_CH08_S03_A_COMPLETE');
  const d6Confirmed = hasDisclosedDeduction(
    state,
    'D6',
    ['E12', 'E14', 'E15', 'E16'],
    'NOTE_CH10_S01_A_COMPLETE',
  );

  const axis1Grounds: string[] = [];
  if (hasDisclosedEvidence(state, 'E05', 'ESECTION_E05_ROSTER')) {
    axis1Grounds.push('확인 대상 명부(태오·이경·은서·준석)와 실제 출입 태그 원본 확보');
  }
  if (hasDisclosedEvidence(state, 'E06', 'ESECTION_E06_CONFIRMATION')) {
    axis1Grounds.push('정지후 서명 전원 퇴실 확인서와 경비 접수 범위 확인');
  }

  const axis2Grounds: string[] = [];
  if (hasDisclosedEvidence(state, 'E01', 'ESECTION_E01_RECORD')) {
    axis2Grounds.push('현장 점검 시점 선택창 HAND 및 외함 흔적 확인');
  }
  if (hasDisclosedEvidence(state, 'E02', 'ESECTION_E02_ENVELOPE')) {
    axis2Grounds.push('19:41 최초 원본 출력 봉인 봉투 확보');
  }
  if (hasDisclosedEvidence(state, 'E07')) {
    axis2Grounds.push('독립 이력 원본(19:37:20 AUTO 복귀 → 19:40:00 예약 이동 → 19:46:02 HAND 변경) 확보');
  }

  const axis3Grounds: string[] = [];
  if (hasDisclosedEvidence(state, 'E04')) {
    axis3Grounds.push('화면 관리자 고정 등록값 정의 및 열쇠 점검대장 확보');
  }
  if (hasDisclosedEvidence(state, 'E06', 'ESECTION_E06_CONFIRMATION')) {
    axis3Grounds.push('안전 확인서 작성 서명(정지후)과 접수 날인(배수현) 확인');
  }
  if (hasDisclosedEvidence(state, 'E11')) {
    axis3Grounds.push('19:44 한이경의 자동 기록 종이 출력 여부 문의 확인');
  }

  const axis4Grounds: string[] = [];
  if (hasDisclosedEvidence(state, 'E09', 'ESECTION_E09_COMMON')) {
    axis4Grounds.push('19:35 A3 19:41 대기 요청 회신 열람 및 19:39:05 A3 고정 내선 통화 확인');
  }
  if (hasDisclosedEvidence(state, 'E10')) {
    axis4Grounds.push('19:39:10 강 원장 잔류 여부를 특정한 재확인 통화 청취');
  }

  const axis5Grounds: string[] = [];
  if (hasDisclosedEvidence(state, 'E03', 'ESECTION_E03_VIDEO')) {
    axis5Grounds.push('19:30~19:45 안전실 연속 영상 및 이동 거리 확인');
  }
  if (scopeConfirmed) {
    axis5Grounds.push('현장 직접 조작 배제와 안전실 허위 확인 작성 가능성의 양립 정리');
  }

  const axes: HypothesisAxisView[] = [
    {
      order: '①',
      title: '확인 대상과 실제 인원',
      status: d1Confirmed ? '확보' : '미확인',
      summary: d1Confirmed
        ? '같은 ‘4’가 같은 집합을 뜻하지 않는다 (대상 명부의 강태오와 안전실 명부의 정지후 구분).'
        : '확인 대상 4명과 안전실 인원 4명의 관계가 아직 확정되지 않았다.',
      grounds: axis1Grounds,
    },
    {
      order: '②',
      title: '작동 경로와 사후 흔적',
      status: d2Confirmed ? '확보' : '미확인',
      summary: d2Confirmed
        ? 'HAND 흔적은 19:40 치명적 예약 이동 뒤에 생겼다.'
        : '19:40 이동과 현재 HAND 상태의 선후 관계가 아직 확정되지 않았다.',
      grounds: axis2Grounds,
    },
    {
      order: '③',
      title: '안전 확인 작성자',
      status: d3Confirmed ? '확보' : '미확인',
      summary: d3Confirmed
        ? '등록 관리자(한이경), 확인서 작성자(정지후), 접수자(배수현)의 역할은 서로 다르다.'
        : '등록 관리자 표시와 실제 안전 확인 작성자의 구분이 아직 확정되지 않았다.',
      grounds: axis3Grounds,
    },
    {
      order: '④',
      title: '잔류 인식',
      status: d4Confirmed ? '확보' : '미확인',
      summary: d4Confirmed
        ? '정지후는 강태오의 A3 잔류를 알고도 재확인 질문에 빈 공간이라고 답했다.'
        : '피해자의 잔류 인식 및 재확인 응답 여부가 아직 확정되지 않았다.',
      grounds: axis4Grounds,
    },
    {
      order: '⑤',
      title: '위치 알리바이의 범위와 인과 논증',
      status: d5Confirmed ? '확보' : '미확인',
      summary: d5Confirmed
        ? '위치 알리바이와 살인의 인과관계(허위 확인 → 예약 마감 → 사망 → 사후 수동 흔적)가 양립한다.'
        : scopeConfirmed
          ? '알리바이의 적용 범위는 구분했으나 전체 인과 논증은 아직 확정되지 않았다.'
          : '안전실 위치 알리바이의 적용 범위와 인과 연결이 아직 확정되지 않았다.',
      grounds: axis5Grounds,
    },
  ];

  const disclosedPrivateGrounds: string[] = [];
  if (hasDisclosedEvidence(state, 'E12', 'ESECTION_E12_PRIVATE_01')) {
    disclosedPrivateGrounds.push('이미 은서가 보관한 친모 관련 원본 일부 확인');
  }
  if (hasDisclosedEvidence(state, 'E15', 'ESECTION_E15_PRIVATE_03')) {
    disclosedPrivateGrounds.push('25년 전 위조 서류와 친모의 미동의 기록 확인');
  }
  if (hasDisclosedEvidence(state, 'E14', 'ESECTION_E14_01')) {
    disclosedPrivateGrounds.push('지후의 이경 고발 진술 초안 및 당일 17:10 수령 서명 확인');
  }
  if (hasDisclosedEvidence(state, 'E16', 'ESECTION_E16_01')) {
    disclosedPrivateGrounds.push('이경의 사후 메모(원본 전달·지후 독립 증언·재산 정리) 확인');
  }

  if (
    disclosedPrivateGrounds.length > 0 ||
    d6Confirmed ||
    hasDisclosedNote(state, 'NOTE_CH10_S01_A_INCOMPLETE') ||
    hasDisclosedNote(state, 'NOTE_CH10_S01_B')
  ) {
    axes.push({
      order: '⑥',
      title: '사후 은폐의 목적',
      status: d6Confirmed ? '확보' : '미확인',
      summary: d6Confirmed
        ? '한이경은 아들의 단절과 자기 과거 폭로까지 알고도 현재 살인의 책임만 가져가려 했다.'
        : '사후 은폐와 자백이 무엇을 위한 선택이었는지 아직 확정되지 않았다.',
      grounds: disclosedPrivateGrounds,
    });
  }

  return axes;
}

export function buildDisplayLogViews(state: RuntimeGameState): LogEntryView[] {
  const entries: LogEntryView[] = [];
  for (const item of state.displayLog) {
    if (!item.blockId || !state.revealedBlocks.has(item.blockId)) continue;
    const scene = GAME_INDEX.scenes.get(item.sceneId);
    const block = GAME_INDEX.blocks.get(item.blockId);
    if (!scene || !block) continue;
    if (block.condition && !evaluateCondition(block.condition, state)) continue;
    if (block.content.type === 'conditional' && !state.resolvedVariants[block.id]) continue;
    const chapter = GAME_CONTENT.chapters.find((candidate) => candidate.id === scene.chapterId);
    entries.push({
      index: entries.length + 1,
      chapterTitle: chapter ? stripChapterDuration(chapter.title) : '',
      sceneTitle: scene.title || (item.stage === 'result' ? '선택 결과' : '본문'),
      text: blockText(block, state),
    });
  }
  return entries;
}

export function buildInvestigationSurface(state: RuntimeGameState): InvestigationSurfaceView {
  const evidenceRecords = buildDisclosedEvidenceRecords(state);
  const statementRecords = buildDisclosedStatementRecords(state);
  return {
    records: [...evidenceRecords, ...statementRecords],
    evidenceRecords,
    statementRecords,
    characters: buildCharacterViews(state),
    timeline: buildTimelineEntries(state),
    roster: buildRosterSummary(state),
    board: buildHypothesisBoard(state),
    logs: buildDisplayLogViews(state),
  };
}
