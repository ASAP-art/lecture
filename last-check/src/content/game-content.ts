import chapter01 from './chapters/chapter-01.json';
import chapter02 from './chapters/chapter-02.json';
import chapter03 from './chapters/chapter-03.json';
import chapter04 from './chapters/chapter-04.json';
import chapter05 from './chapters/chapter-05.json';
import chapter06 from './chapters/chapter-06.json';
import chapter07 from './chapters/chapter-07.json';
import support0507 from './chapters/support-05-07.json';
import chapter08 from './chapters/chapter-08.json';
import chapter09 from './chapters/chapter-09.json';
import chapter10 from './chapters/chapter-10.json';
import support0810 from './chapters/support-08-10.json';
import { createGameContentIndex } from './index';
import { parseGameContent } from './schema';
import { SOURCE_PATH, SOURCE_SHA256 } from './source';

const source = (lineStart: number, lineEnd: number, stableBlockId: `SRC_${string}`) => ({
  sourceHash: SOURCE_SHA256,
  sourcePath: SOURCE_PATH,
  lineStart,
  lineEnd,
  stableBlockId,
});

type SourceChapter = {
  scenes: Array<{
    id: string;
    blocks: Array<{ kind: string; content: { text: string } }>;
  }>;
};

const sceneBody = (chapter: SourceChapter, sceneId: string): string => {
  const scene = chapter.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new Error(`수첩 본문 scene 없음: ${sceneId}`);
  return scene.blocks
    .filter((block) => block.kind !== 'choicePrompt')
    .map((block) => block.content.text)
    .join('\n\n');
};

export const GAME_CONTENT = parseGameContent({
  schemaVersion: 1,
  sourceHash: SOURCE_SHA256,
  characters: [
    { id: 'CHAR_SEOJIN', name: '윤서진', source: source(30, 30, 'SRC_CHARACTER_SEOJIN') },
    { id: 'CHAR_DOHYEON', name: '박도현', source: source(31, 31, 'SRC_CHARACTER_DOHYEON') },
    { id: 'CHAR_IKYEONG', name: '한이경', source: source(33, 33, 'SRC_CHARACTER_IKYEONG') },
    { id: 'CHAR_JIHU', name: '정지후', source: source(34, 34, 'SRC_CHARACTER_JIHU') },
    { id: 'CHAR_SUHYEON', name: '배수현', source: source(37, 37, 'SRC_CHARACTER_SUHYEON') },
    { id: 'CHAR_EUNSEO', name: '최은서', source: source(35, 35, 'SRC_CHARACTER_EUNSEO') },
    { id: 'CHAR_JUNSEOK', name: '오준석', source: source(36, 36, 'SRC_CHARACTER_JUNSEOK') },
  ],
  evidence: [
    {
      id: 'E01',
      title: '기계실 외함에 금속이 쓸린 흔적이 보였다.',
      sectionIds: ['ESECTION_E01_RECORD'],
      source: source(238, 238, 'SRC_E01'),
    },
    {
      id: 'E02',
      title: '‘19:41 / 원본 출력 / 봉인’',
      sectionIds: ['ESECTION_E02_ENVELOPE'],
      source: source(244, 266, 'SRC_E02'),
    },
    {
      id: 'E03',
      title: '지후의 연속 영상·목격·출입·이동거리',
      sectionIds: ['ESECTION_E03_VIDEO', 'ESECTION_E03_VERIFICATION'],
      source: source(179, 179, 'SRC_E03'),
    },
    {
      id: 'E04',
      title: '모드 설명·등록 관리자 값·열쇠 점검대장',
      sectionIds: ['ESECTION_E04_MODE', 'ESECTION_E04_CH07_S01_B'],
      source: source(180, 180, 'SRC_E04'),
    },
    {
      id: 'E05',
      title: '확인 대상 명부와 실제 출입 태그 원본',
      sectionIds: ['ESECTION_E05_ROSTER'],
      source: source(181, 181, 'SRC_E05'),
    },
    {
      id: 'E06',
      title: '지후 서명 원본과 경비의 접수 범위',
      sectionIds: ['ESECTION_E06_CONFIRMATION'],
      source: source(182, 182, 'SRC_E06'),
    },
    {
      id: 'E07',
      title: '독립 이력: AUTO 복귀→예약 이동→HAND 변경',
      sectionIds: ['ESECTION_E07_HISTORY', 'ESECTION_E07_CH07_S01_A'],
      source: source(183, 183, 'SRC_E07'),
    },
    {
      id: 'E11',
      title: '19:44 이경의 출력물 문의',
      sectionIds: ['ESECTION_E11_INQUIRY', 'ESECTION_E11_CH07_S01_C'],
      source: source(186, 186, 'SRC_E11'),
    },
    ...support0507.evidence,
    ...support0810.evidence,
  ],
  evidenceSections: [
    {
      id: 'ESECTION_E01_RECORD',
      evidenceId: 'E01',
      title: '기계실 외함에 금속이 쓸린 흔적이 보였다.',
      body: '선택창에는 HAND. 옆 모니터에는 ‘관리자: 한이경’이라고 적혀 있었다.',
      source: source(238, 238, 'SRC_ESECTION_E01_RECORD'),
    },
    {
      id: 'ESECTION_E02_ENVELOPE',
      evidenceId: 'E02',
      title: '‘19:41 / 원본 출력 / 봉인’',
      body: '수현: “제가 출력되고 바로 넣었어요. 이 줄이 사건번호고, 여기 제 서명이에요.”\n\n서진: “내용을 고치거나 다시 뽑은 적은요?”\n\n수현: “없어요. 제 책상에 계속 있었어요.”\n\n도현: “원본 보전 요청 넣겠습니다. 뜯는 건 분석실에서 같이 하죠.”',
      source: source(256, 262, 'SRC_ESECTION_E02_ENVELOPE'),
    },
    {
      id: 'ESECTION_E03_VIDEO',
      evidenceId: 'E03',
      title: '지후의 연속 영상·목격·출입·이동거리',
      body: sceneBody(chapter03, 'CH03_S01'),
      source: source(436, 454, 'SRC_ESECTION_E03_VIDEO'),
    },
    {
      id: 'ESECTION_E03_VERIFICATION',
      evidenceId: 'E03',
      title: 'E03 검증 메모 추가.',
      body: sceneBody(chapter03, 'CH03_S01_A'),
      source: source(462, 468, 'SRC_ESECTION_E03_VERIFICATION'),
    },
    {
      id: 'ESECTION_E04_MODE',
      evidenceId: 'E04',
      title: '모드 설명·등록 관리자 값·열쇠 점검대장',
      body: sceneBody(chapter02, 'CH02_S02_A'),
      source: source(410, 416, 'SRC_ESECTION_E04_MODE'),
    },
    {
      id: 'ESECTION_E05_ROSTER',
      evidenceId: 'E05',
      title: '확인 대상 명부와 실제 출입 태그 원본',
      body: sceneBody(chapter03, 'CH03_S02'),
      source: source(488, 506, 'SRC_ESECTION_E05_ROSTER'),
    },
    {
      id: 'ESECTION_E06_CONFIRMATION',
      evidenceId: 'E06',
      title: '지후 서명 원본과 경비의 접수 범위',
      body: sceneBody(chapter04, 'CH04_S01'),
      source: source(600, 618, 'SRC_ESECTION_E06_CONFIRMATION'),
    },
    {
      id: 'ESECTION_E07_HISTORY',
      evidenceId: 'E07',
      title: '독립 이력: AUTO 복귀→예약 이동→HAND 변경',
      body: sceneBody(chapter04, 'CH04_S02_A'),
      source: source(676, 688, 'SRC_ESECTION_E07_HISTORY'),
    },
    {
      id: 'ESECTION_E11_INQUIRY',
      evidenceId: 'E11',
      title: '19:44 이경의 출력물 문의',
      body: sceneBody(chapter02, 'CH02_S01_B'),
      source: source(371, 377, 'SRC_ESECTION_E11_INQUIRY'),
    },
    ...support0507.evidenceSections,
    ...support0810.evidenceSections,
  ],
  notebookEntries: [
    {
      id: 'NOTE_CH01_C02_A_STATEMENT',
      title: '진술은 수첩에 보존.',
      body: '서진: “열쇠를 쓴 시각과 목적부터 말씀하세요. 살인 여부는 그다음입니다.”\n\n이경: “7시 37분쯤. 점검 서명을 하려고요.”\n\n서진: “다시 기계실에 간 적도 있습니까?”\n\n이경: “있습니다.”\n\n그녀는 두 번째 시각을 스스로 덧붙이지 않았다.',
      source: source(310, 320, 'SRC_NOTE_CH01_C02_A_STATEMENT'),
    },
    {
      id: 'NOTE_CH01_C02_B_STATEMENT',
      title: '진술 보존.',
      body: '이경: “제가 죽였다고 하면, 아들 쪽은 끝나는 겁니까?”\n\n서진: “그런 거래는 없습니다.”\n\n이경: “알겠습니다. 그럼 질문하신 것만 답하죠.”\n\n지후가 고개를 들었다. 이경과 눈을 맞추지는 않았다.',
      source: source(323, 331, 'SRC_NOTE_CH01_C02_B_STATEMENT'),
    },
    {
      id: 'NOTE_CH02_C03_A_LEDGER',
      title: '장부 진술 보존.',
      body: sceneBody(chapter02, 'CH02_S01_A'),
      source: source(358, 366, 'SRC_NOTE_CH02_C03_A_LEDGER'),
    },
    {
      id: 'NOTE_CH03_C05_B_WORK',
      title: '업무 진술 보존.',
      body: sceneBody(chapter03, 'CH03_S01_B'),
      source: source(473, 481, 'SRC_NOTE_CH03_C05_B_WORK'),
    },
    {
      id: 'NOTE_CH03_C06_A_RECEIPT',
      title: '접수 범위 진술.',
      body: sceneBody(chapter03, 'CH03_S02_A'),
      source: source(515, 521, 'SRC_NOTE_CH03_C06_A_RECEIPT'),
    },
    {
      id: 'NOTE_CH03_C06_B_WITNESS',
      title: '목격 진술.',
      body: sceneBody(chapter03, 'CH03_S02_B'),
      source: source(526, 534, 'SRC_NOTE_CH03_C06_B_WITNESS'),
    },
    {
      id: 'NOTE_CH03_C06_C_ORIGINAL',
      title: '원본 보관 암시.',
      body: sceneBody(chapter03, 'CH03_S02_C'),
      source: source(539, 545, 'SRC_NOTE_CH03_C06_C_ORIGINAL'),
    },
    {
      id: 'NOTE_CH03_C07_A_PRIVATE',
      title: '비공개 면담 제안.',
      body: sceneBody(chapter03, 'CH03_S03_A'),
      source: source(574, 580, 'SRC_NOTE_CH03_C07_A_PRIVATE'),
    },
    {
      id: 'NOTE_CH03_C07_B_LIMIT',
      title: '협조 범위 제한.',
      body: sceneBody(chapter03, 'CH03_S03_B'),
      source: source(585, 591, 'SRC_NOTE_CH03_C07_B_LIMIT'),
    },
    {
      id: 'NOTE_CH04_C08_A_BASIS',
      title: '확인 근거 진술.',
      body: sceneBody(chapter04, 'CH04_S01_A'),
      source: source(626, 634, 'SRC_NOTE_CH04_C08_A_BASIS'),
    },
    {
      id: 'NOTE_CH04_C09_B_CONFESSION',
      title: '자백 상세.',
      body: sceneBody(chapter04, 'CH04_S02_B'),
      source: source(693, 705, 'SRC_NOTE_CH04_C09_B_CONFESSION'),
    },
    ...support0507.notebookEntries,
    ...support0810.notebookEntries,
  ],
  deductions: [...support0507.deductions, ...support0810.deductions],
  assets: [
    {
      id: 'ASSET_BG_ARCHIVE',
      kind: 'background',
      publicPath: '/assets/bg_archive.png',
      alt: '지하 수장고 이동식 서가와 안쪽 흰 가림막',
      source: source(21, 21, 'SRC_ASSET_BG_ARCHIVE'),
    },
    {
      id: 'ASSET_BG_INTERVIEW',
      kind: 'background',
      publicPath: '/assets/bg_interview.png',
      alt: '이음기록원 면담실 책상과 서류철',
      source: source(21, 21, 'SRC_ASSET_BG_INTERVIEW'),
    },
    {
      id: 'ASSET_CHAR_YIKYUNG_NEUTRAL',
      kind: 'portrait',
      publicPath: '/assets/char_yikyung_neutral.png',
      alt: '한이경 인물 초상',
      source: source(33, 33, 'SRC_ASSET_CHAR_YIKYUNG_NEUTRAL'),
    },
    {
      id: 'ASSET_BG_MACHINE_ROOM',
      kind: 'background',
      publicPath: '/assets/bg_machine.a0324e37027d.webp',
      alt: '기계실 설비 설명 참고컷',
      source: source(384, 398, 'SRC_ASSET_BG_MACHINE_ROOM'),
    },
    {
      id: 'ASSET_BG_SAFETY_ROOM',
      kind: 'background',
      publicPath: '/assets/bg_safety.f956c6f93b77.webp',
      alt: '안전실 공간 참고컷 (원본 CCTV 아님)',
      source: source(436, 450, 'SRC_ASSET_BG_SAFETY_ROOM'),
    },
    {
      id: 'ASSET_BG_GUARD_ROOM',
      kind: 'background',
      publicPath: '/assets/bg_breakroom.ee89bf130ab6.webp',
      alt: '휴게실 탁자와 종이컵 세 개',
      source: source(938, 938, 'SRC_ASSET_BG_GUARD_ROOM'),
    },
    {
      id: 'ASSET_BG_CORRIDOR',
      kind: 'background',
      publicPath: '/assets/bg_corridor.b0b638a3994e.webp',
      alt: '기록원 복도와 대기 의자',
      source: source(1330, 1330, 'SRC_ASSET_BG_CORRIDOR'),
    },
    {
      id: 'ASSET_BG_ANALYSIS_ROOM',
      kind: 'background',
      publicPath: '/assets/bg_analysis.cf6ca1d94488.webp',
      alt: '자료 대조 공간 설명 참고컷',
      source: source(19, 19, 'SRC_ASSET_BG_ANALYSIS_ROOM'),
    },
    {
      id: 'ASSET_CHAR_DOHYEON_NEUTRAL',
      kind: 'portrait',
      publicPath: '/assets/char_dohyun_neutral.f6dfe34b531d.png',
      alt: '박도현 중립 초상',
      source: source(31, 31, 'SRC_ASSET_CHAR_DOHYEON_NEUTRAL'),
    },
    {
      id: 'ASSET_CHAR_JIHU_NEUTRAL',
      kind: 'portrait',
      publicPath: '/assets/char_jihoo_neutral.30d0be0c641f.png',
      alt: '정지후 중립 초상',
      source: source(34, 34, 'SRC_ASSET_CHAR_JIHU_NEUTRAL'),
    },
    {
      id: 'ASSET_CHAR_EUNSEO_NEUTRAL',
      kind: 'portrait',
      publicPath: '/assets/char_eunseo_neutral.3f6c621f8a94.png',
      alt: '최은서 중립 초상',
      source: source(35, 35, 'SRC_ASSET_CHAR_EUNSEO_NEUTRAL'),
    },
    {
      id: 'ASSET_CHAR_JUNSEOK_NEUTRAL',
      kind: 'portrait',
      publicPath: '/assets/char_junseok_neutral.1f68a9d87435.png',
      alt: '오준석 중립 초상',
      source: source(36, 36, 'SRC_ASSET_CHAR_JUNSEOK_NEUTRAL'),
    },
    {
      id: 'ASSET_CHAR_SUHYEON_NEUTRAL',
      kind: 'portrait',
      publicPath: '/assets/char_suhyun_neutral.c5bf2a73ce54.png',
      alt: '배수현 중립 초상',
      source: source(37, 37, 'SRC_ASSET_CHAR_SUHYEON_NEUTRAL'),
    },
    {
      id: 'ASSET_TITLE_MAIN',
      kind: 'background',
      publicPath: '/assets/title_main.8acbf9a91c2b.webp',
      alt: '제목 화면의 봉투와 빈 종이',
      source: source(1, 1, 'SRC_ASSET_TITLE_MAIN'),
    },
    {
      id: 'ASSET_DOC_SEAL_ENVELOPE',
      kind: 'document',
      publicPath: '/assets/cg_sealed_envelope.096d00275bca.webp',
      alt: '봉인된 갈색 봉투 삽화',
      source: source(244, 244, 'SRC_ASSET_DOC_SEAL_ENVELOPE'),
    },
    {
      id: 'ASSET_CG_CCTV_SAFETY',
      kind: 'document',
      publicPath: '/assets/cg_cctv_safety.75ac0260c6b4.webp',
      alt: '안전실 영상 대조 삽화',
      source: source(436, 436, 'SRC_ASSET_CG_CCTV_SAFETY'),
    },
    {
      id: 'ASSET_CG_NOTEBOOK',
      kind: 'document',
      publicPath: '/assets/cg_notebook.6950bd84509c.webp',
      alt: '펼친 수첩 삽화',
      source: source(1410, 1410, 'SRC_ASSET_CG_NOTEBOOK'),
    },
    {
      id: 'ASSET_CG_LETTER',
      kind: 'document',
      publicPath: '/assets/cg_letter.3e772475caf9.webp',
      alt: '접힌 편지 삽화',
      source: source(1352, 1352, 'SRC_ASSET_CG_LETTER'),
    },
    {
      id: 'ASSET_END_TRUE',
      kind: 'document',
      publicPath: '/assets/end_true.d544b2136f72.webp',
      alt: '빈 면담실 책상 위 두 장의 종이',
      source: source(1674, 1674, 'SRC_ASSET_END_TRUE'),
    },
    {
      id: 'ASSET_END_GOOD',
      kind: 'document',
      publicPath: '/assets/end_good.7642fc336233.webp',
      alt: '면담실 책상 위 서류 묶음과 닫힌 봉투',
      source: source(1743, 1743, 'SRC_ASSET_END_GOOD'),
    },
    {
      id: 'ASSET_END_BAD01',
      kind: 'document',
      publicPath: '/assets/end_bad01.009de59bd4c7.webp',
      alt: '서류와 영상 모니터가 놓인 책상 (인물은 영상 속 참고 표현)',
      source: source(1808, 1808, 'SRC_ASSET_END_BAD01'),
    },
    {
      id: 'ASSET_END_BAD02',
      kind: 'document',
      publicPath: '/assets/end_bad02.33eb7099ca39.webp',
      alt: '꺼진 모니터와 서류가 놓인 책상',
      source: source(1889, 1889, 'SRC_ASSET_END_BAD02'),
    },
  ],
  flags: [
    { id: 'FLAG_ENVELOPE', source: source(266, 266, 'SRC_FLAG_ENVELOPE') },
    { id: 'FLAG_EARLY_ACCUSE', source: source(331, 331, 'SRC_FLAG_EARLY_ACCUSE') },
    ...support0507.flags,
    ...support0810.flags,
  ],
  effects: [
    {
      id: 'FX_CH01_ENTRY_E01',
      operations: [{ op: 'addEvidence', evidenceId: 'E01' }],
      source: source(228, 228, 'SRC_FX_CH01_ENTRY_E01'),
    },
    {
      id: 'FX_CH01_REVEAL_E01',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E01_RECORD' }],
      source: source(238, 238, 'SRC_FX_CH01_REVEAL_E01'),
    },
    {
      id: 'FX_C01_A',
      operations: [
        { op: 'addEvidence', evidenceId: 'E02' },
        { op: 'setFlag', flagId: 'FLAG_ENVELOPE', value: true },
        { op: 'adjustTrust', characterId: 'CHAR_SUHYEON', delta: 1 },
      ],
      source: source(266, 266, 'SRC_FX_C01_A'),
    },
    {
      id: 'FX_CH01_REVEAL_E02',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E02_ENVELOPE' }],
      source: source(256, 266, 'SRC_FX_CH01_REVEAL_E02'),
    },
    {
      id: 'FX_C01_B',
      operations: [{ op: 'adjustSuspicion', characterId: 'CHAR_IKYEONG', delta: 1 }],
      source: source(277, 277, 'SRC_FX_C01_B'),
    },
    {
      id: 'FX_C02_A',
      operations: [{ op: 'adjustTrust', characterId: 'CHAR_IKYEONG', delta: 1 }],
      source: source(320, 320, 'SRC_FX_C02_A'),
    },
    {
      id: 'FX_CH01_REVEAL_C02_A_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH01_C02_A_STATEMENT' }],
      source: source(320, 320, 'SRC_FX_CH01_REVEAL_C02_A_NOTE'),
    },
    {
      id: 'FX_C02_B',
      operations: [
        { op: 'setFlag', flagId: 'FLAG_EARLY_ACCUSE', value: true },
        { op: 'adjustSuspicion', characterId: 'CHAR_IKYEONG', delta: 1 },
        { op: 'adjustTrust', characterId: 'CHAR_IKYEONG', delta: -1 },
      ],
      source: source(331, 331, 'SRC_FX_C02_B'),
    },
    {
      id: 'FX_CH01_REVEAL_C02_B_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH01_C02_B_STATEMENT' }],
      source: source(331, 331, 'SRC_FX_CH01_REVEAL_C02_B_NOTE'),
    },
    {
      id: 'FX_C03_A',
      operations: [{ op: 'adjustSuspicion', characterId: 'CHAR_IKYEONG', delta: 1 }],
      source: source(368, 368, 'SRC_FX_C03_A'),
    },
    {
      id: 'FX_CH02_REVEAL_C03_A_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH02_C03_A_LEDGER' }],
      source: source(358, 368, 'SRC_FX_CH02_REVEAL_C03_A_NOTE'),
    },
    {
      id: 'FX_C03_B',
      operations: [
        { op: 'addEvidence', evidenceId: 'E11' },
        { op: 'adjustTrust', characterId: 'CHAR_SUHYEON', delta: 1 },
      ],
      source: source(379, 379, 'SRC_FX_C03_B'),
    },
    {
      id: 'FX_CH02_REVEAL_E11',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E11_INQUIRY' }],
      source: source(371, 379, 'SRC_FX_CH02_REVEAL_E11'),
    },
    {
      id: 'FX_C04_A',
      operations: [
        { op: 'addEvidence', evidenceId: 'E04' },
        { op: 'adjustTrust', characterId: 'CHAR_JUNSEOK', delta: 1 },
      ],
      source: source(418, 418, 'SRC_FX_C04_A'),
    },
    {
      id: 'FX_CH02_REVEAL_E04',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E04_MODE' }],
      source: source(410, 418, 'SRC_FX_CH02_REVEAL_E04'),
    },
    {
      id: 'FX_C04_B',
      operations: [
        { op: 'adjustTrust', characterId: 'CHAR_JUNSEOK', delta: -1 },
        { op: 'adjustSuspicion', characterId: 'CHAR_JUNSEOK', delta: 1 },
      ],
      source: source(429, 429, 'SRC_FX_C04_B'),
    },
    {
      id: 'FX_CH03_ENTRY_E03',
      operations: [{ op: 'addEvidence', evidenceId: 'E03' }],
      source: source(434, 434, 'SRC_FX_CH03_ENTRY_E03'),
    },
    {
      id: 'FX_CH03_REVEAL_E03',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E03_VIDEO' }],
      source: source(436, 454, 'SRC_FX_CH03_REVEAL_E03'),
    },
    {
      id: 'FX_C05_A',
      operations: [
        { op: 'adjustTrust', characterId: 'CHAR_JIHU', delta: 1 },
        { op: 'adjustSuspicion', characterId: 'CHAR_JIHU', delta: -1 },
      ],
      source: source(470, 470, 'SRC_FX_C05_A'),
    },
    {
      id: 'FX_CH03_REVEAL_E03_VERIFICATION',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E03_VERIFICATION' }],
      source: source(462, 470, 'SRC_FX_CH03_REVEAL_E03_VERIFICATION'),
    },
    {
      id: 'FX_C05_B',
      operations: [{ op: 'adjustSuspicion', characterId: 'CHAR_JIHU', delta: 1 }],
      source: source(483, 483, 'SRC_FX_C05_B'),
    },
    {
      id: 'FX_CH03_REVEAL_C05_B_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH03_C05_B_WORK' }],
      source: source(473, 483, 'SRC_FX_CH03_REVEAL_C05_B_NOTE'),
    },
    {
      id: 'FX_CH03_ENTRY_E05',
      operations: [{ op: 'addEvidence', evidenceId: 'E05' }],
      source: source(486, 486, 'SRC_FX_CH03_ENTRY_E05'),
    },
    {
      id: 'FX_CH03_REVEAL_E05',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E05_ROSTER' }],
      source: source(488, 506, 'SRC_FX_CH03_REVEAL_E05'),
    },
    {
      id: 'FX_C06_A',
      operations: [{ op: 'adjustTrust', characterId: 'CHAR_SUHYEON', delta: 1 }],
      source: source(523, 523, 'SRC_FX_C06_A'),
    },
    {
      id: 'FX_CH03_REVEAL_C06_A_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH03_C06_A_RECEIPT' }],
      source: source(515, 523, 'SRC_FX_CH03_REVEAL_C06_A_NOTE'),
    },
    {
      id: 'FX_C06_B',
      operations: [{ op: 'adjustSuspicion', characterId: 'CHAR_JIHU', delta: 1 }],
      source: source(536, 536, 'SRC_FX_C06_B'),
    },
    {
      id: 'FX_CH03_REVEAL_C06_B_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH03_C06_B_WITNESS' }],
      source: source(526, 536, 'SRC_FX_CH03_REVEAL_C06_B_NOTE'),
    },
    {
      id: 'FX_C06_C',
      operations: [{ op: 'adjustTrust', characterId: 'CHAR_EUNSEO', delta: 1 }],
      source: source(547, 547, 'SRC_FX_C06_C'),
    },
    {
      id: 'FX_CH03_REVEAL_C06_C_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH03_C06_C_ORIGINAL' }],
      source: source(539, 547, 'SRC_FX_CH03_REVEAL_C06_C_NOTE'),
    },
    {
      id: 'FX_C07_A',
      operations: [{ op: 'adjustTrust', characterId: 'CHAR_EUNSEO', delta: 1 }],
      source: source(582, 582, 'SRC_FX_C07_A'),
    },
    {
      id: 'FX_CH03_REVEAL_C07_A_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH03_C07_A_PRIVATE' }],
      source: source(574, 582, 'SRC_FX_CH03_REVEAL_C07_A_NOTE'),
    },
    {
      id: 'FX_C07_B',
      operations: [{ op: 'adjustTrust', characterId: 'CHAR_EUNSEO', delta: -1 }],
      source: source(593, 593, 'SRC_FX_C07_B'),
    },
    {
      id: 'FX_CH03_REVEAL_C07_B_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH03_C07_B_LIMIT' }],
      source: source(585, 593, 'SRC_FX_CH03_REVEAL_C07_B_NOTE'),
    },
    {
      id: 'FX_CH04_ENTRY_E06',
      operations: [{ op: 'addEvidence', evidenceId: 'E06' }],
      source: source(598, 598, 'SRC_FX_CH04_ENTRY_E06'),
    },
    {
      id: 'FX_CH04_REVEAL_E06',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E06_CONFIRMATION' }],
      source: source(600, 618, 'SRC_FX_CH04_REVEAL_E06'),
    },
    {
      id: 'FX_C08_A',
      operations: [{ op: 'adjustSuspicion', characterId: 'CHAR_JIHU', delta: 1 }],
      source: source(636, 636, 'SRC_FX_C08_A'),
    },
    {
      id: 'FX_CH04_REVEAL_C08_A_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH04_C08_A_BASIS' }],
      source: source(626, 636, 'SRC_FX_CH04_REVEAL_C08_A_NOTE'),
    },
    {
      id: 'FX_C08_B',
      operations: [
        { op: 'adjustTrust', characterId: 'CHAR_SUHYEON', delta: -1 },
        { op: 'adjustTrust', characterId: 'CHAR_JUNSEOK', delta: -1 },
        { op: 'adjustSuspicion', characterId: 'CHAR_SUHYEON', delta: 1 },
      ],
      source: source(651, 651, 'SRC_FX_C08_B'),
    },
    {
      id: 'FX_C09_A',
      operations: [
        { op: 'addEvidence', evidenceId: 'E07' },
        { op: 'adjustTrust', characterId: 'CHAR_JUNSEOK', delta: 1 },
      ],
      source: source(690, 690, 'SRC_FX_C09_A'),
    },
    {
      id: 'FX_CH04_REVEAL_E07',
      operations: [{ op: 'revealEvidenceSection', sectionId: 'ESECTION_E07_HISTORY' }],
      source: source(676, 690, 'SRC_FX_CH04_REVEAL_E07'),
    },
    {
      id: 'FX_C09_B',
      operations: [{ op: 'adjustSuspicion', characterId: 'CHAR_IKYEONG', delta: 1 }],
      source: source(707, 707, 'SRC_FX_C09_B'),
    },
    {
      id: 'FX_CH04_REVEAL_C09_B_NOTE',
      operations: [{ op: 'revealNotebookEntry', entryId: 'NOTE_CH04_C09_B_CONFESSION' }],
      source: source(693, 707, 'SRC_FX_CH04_REVEAL_C09_B_NOTE'),
    },
    ...support0507.effects,
    ...support0810.effects,
  ],
  chapters: [chapter01, chapter02, chapter03, chapter04, chapter05, chapter06, chapter07, chapter08, chapter09, chapter10],
  unimplementedSceneIds: [],
});

export const GAME_INDEX = createGameContentIndex(GAME_CONTENT);
