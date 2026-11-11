import { evaluateCondition, type Condition } from '../content/conditions';
import { GAME_INDEX } from '../content/game-content';
import type { BlockId, SceneId, VariantId } from '../content/ids';
import { currentBlock } from './gameplay';
import type { RuntimeGameState } from './state';

export type ArtAssetId =
  | 'bg_archive'
  | 'bg_interview'
  | 'char_yikyung_neutral'
  | 'bg_machine_room'
  | 'bg_safety_room'
  | 'bg_guard_room'
  | 'bg_corridor'
  | 'bg_analysis_room'
  | 'char_dohyeon_neutral'
  | 'char_jihu_neutral'
  | 'char_eunseo_neutral'
  | 'char_junseok_neutral'
  | 'char_suhyeon_neutral'
  | 'doc_seal_envelope'
  | 'doc_roster_tags'
  | 'doc_safety_confirmation'
  | 'doc_independent_log'
  | 'title_main'
  | 'cg_cctv_safety'
  | 'cg_notebook'
  | 'cg_letter'
  | 'end_true'
  | 'end_good'
  | 'end_bad01'
  | 'end_bad02';

export interface ArtAssetMetadata {
  readonly id: ArtAssetId;
  readonly schemaId: `ASSET_${string}`;
  readonly kind: 'background' | 'portrait' | 'document';
  readonly status: 'received' | 'unreceived';
  readonly sourcePath: string | null;
  readonly publicPath: string | null;
  readonly format: 'PNG' | 'WebP' | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly aspectRatio: string | null;
  readonly hasAlpha: boolean | null;
  readonly sha256: string | null;
  readonly fit: 'cover' | 'contain';
  readonly position: string;
  readonly alt: string;
}

export const ART_ASSETS: Readonly<Record<ArtAssetId, ArtAssetMetadata>> = {
  end_true: {
    id: 'end_true',
    schemaId: 'ASSET_END_TRUE',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/end_true.png',
    publicPath: '/assets/end_true.d544b2136f72.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'd544b2136f72ca5b4ef7a1cb4cbe86cf9105732e26bfbaed1f0c075b18e61b79',
    fit: 'contain',
    position: 'center center',
    alt: '빈 면담실 책상 위 두 장의 종이',
  },
  end_good: {
    id: 'end_good',
    schemaId: 'ASSET_END_GOOD',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/end_good.png',
    publicPath: '/assets/end_good.7642fc336233.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '7642fc3362336d1887b8fb0b1512824f0df10192216798b6215c5bbdcfcb812c',
    fit: 'contain',
    position: 'center center',
    alt: '면담실 책상 위 서류 묶음과 닫힌 봉투',
  },
  end_bad01: {
    id: 'end_bad01',
    schemaId: 'ASSET_END_BAD01',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/end_bad01.png',
    publicPath: '/assets/end_bad01.009de59bd4c7.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '009de59bd4c721ecda8201ab6cf6e6e77ed4d5f93d26d552881c0ee61a83c2ed',
    fit: 'contain',
    position: 'center center',
    alt: '서류와 영상 모니터가 놓인 책상 (인물은 영상 속 참고 표현)',
  },
  end_bad02: {
    id: 'end_bad02',
    schemaId: 'ASSET_END_BAD02',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/end_bad02.png',
    publicPath: '/assets/end_bad02.33eb7099ca39.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '33eb7099ca39fa9bf17031146aca868fe87e104b60343480bfb3a62422205e90',
    fit: 'contain',
    position: 'center center',
    alt: '꺼진 모니터와 서류가 놓인 책상',
  },
  title_main: {
    id: 'title_main',
    schemaId: 'ASSET_TITLE_MAIN',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/title_main.png',
    publicPath: '/assets/title_main.8acbf9a91c2b.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '8acbf9a91c2bd64c69fe0f630704cf20dda5fb7de0e9b6d85d3aff628b7cb85d',
    fit: 'contain',
    position: 'center center',
    alt: '제목 화면의 봉투와 빈 종이',
  },
  cg_cctv_safety: {
    id: 'cg_cctv_safety',
    schemaId: 'ASSET_CG_CCTV_SAFETY',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/cg_cctv_safety.png',
    publicPath: '/assets/cg_cctv_safety.75ac0260c6b4.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '75ac0260c6b41995f1397869b2fb2ec9f8a91d22ed2f098c1671f00634ec0113',
    fit: 'contain',
    position: 'center center',
    alt: '안전실 영상 대조 삽화',
  },
  cg_notebook: {
    id: 'cg_notebook',
    schemaId: 'ASSET_CG_NOTEBOOK',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/cg_notebook.png',
    publicPath: '/assets/cg_notebook.6950bd84509c.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '6950bd84509c6f35538e696918c0a0613acae8a0da07cd97f60b1de957d6a041',
    fit: 'contain',
    position: 'center center',
    alt: '펼친 수첩 삽화',
  },
  cg_letter: {
    id: 'cg_letter',
    schemaId: 'ASSET_CG_LETTER',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/cg_letter.png',
    publicPath: '/assets/cg_letter.3e772475caf9.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '3e772475caf97a12d8e9e1fa563477120c6e08508bee0d82432bb315b84b97fa',
    fit: 'contain',
    position: 'center center',
    alt: '접힌 편지 삽화',
  },
  bg_archive: {
    id: 'bg_archive',
    schemaId: 'ASSET_BG_ARCHIVE',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_archive.png',
    publicPath: '/assets/bg_archive.png',
    format: 'PNG',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'a7604a3c1ed150c1124e9e999358defa9edeef3e7a3d1a457795a05bf84791dc',
    fit: 'cover',
    position: 'center center',
    alt: '지하 수장고 이동식 서가와 안쪽 흰 가림막',
  },
  bg_interview: {
    id: 'bg_interview',
    schemaId: 'ASSET_BG_INTERVIEW',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_interview.png',
    publicPath: '/assets/bg_interview.png',
    format: 'PNG',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'a67b48b626cc724e1c15facf836aa2fddcf652098cf65f3548b8f8beb7f5204c',
    fit: 'cover',
    position: 'center center',
    alt: '이음기록원 면담실 책상과 서류철',
  },
  char_yikyung_neutral: {
    id: 'char_yikyung_neutral',
    schemaId: 'ASSET_CHAR_YIKYUNG_NEUTRAL',
    kind: 'portrait',
    status: 'received',
    sourcePath: 'art-source/originals/char_yikyung_neutral.png',
    publicPath: '/assets/char_yikyung_neutral.png',
    format: 'PNG',
    width: 1024,
    height: 1536,
    aspectRatio: '2:3',
    hasAlpha: true,
    sha256: '9b5293cc1ce22e2a19adaf5efaa924ec89f667747e81e7e21198d654f2cd576a',
    fit: 'contain',
    position: 'center bottom',
    alt: '한이경 인물 초상 (코트 단추와 두 손이 보이는 정면 중립 표정)',
  },
  bg_machine_room: {
    id: 'bg_machine_room',
    schemaId: 'ASSET_BG_MACHINE_ROOM',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_machine.png',
    publicPath: '/assets/bg_machine.a0324e37027d.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'a0324e37027d11f6ee52f9d8872589bb079ba1c49d73f536c0ee7621b011a6fd',
    fit: 'contain',
    position: 'center center',
    alt: '설비 설명 참고컷: 이동식 서가 옆 기계 외함과 화면이 비어 있는 단말',
  },
  bg_safety_room: {
    id: 'bg_safety_room',
    schemaId: 'ASSET_BG_SAFETY_ROOM',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_safety.png',
    publicPath: '/assets/bg_safety.f956c6f93b77.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'f956c6f93b772bf16cb057d0df6cc8b596a1d3f67d9496c12b38abab6659ba99',
    fit: 'contain',
    position: 'center center',
    alt: '안전실 공간 참고컷: 빈 단말 화면과 전화기, 서류가 놓인 책상',
  },
  bg_guard_room: {
    id: 'bg_guard_room',
    schemaId: 'ASSET_BG_GUARD_ROOM',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_breakroom.png',
    publicPath: '/assets/bg_breakroom.ee89bf130ab6.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'ee89bf130ab6e5705306d28b4a4434847a68ff8b6845160fbba2e123d6b65a64',
    fit: 'contain',
    position: 'center center',
    alt: '종이컵 세 개가 놓인 휴게실 탁자와 의자',
  },
  bg_corridor: {
    id: 'bg_corridor',
    schemaId: 'ASSET_BG_CORRIDOR',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_corridor.png',
    publicPath: '/assets/bg_corridor.b0b638a3994e.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'b0b638a3994e7e5cb8112bc021cf9e3b33e4239c04fa5b3475a619611d36ea40',
    fit: 'contain',
    position: 'center center',
    alt: '기록원 복도와 종이 상자가 놓인 대기 의자',
  },
  bg_analysis_room: {
    id: 'bg_analysis_room',
    schemaId: 'ASSET_BG_ANALYSIS_ROOM',
    kind: 'background',
    status: 'received',
    sourcePath: 'art-source/originals/bg_analysis.png',
    publicPath: '/assets/bg_analysis.cf6ca1d94488.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: 'cf6ca1d944886f4d852f38d5e5dcdb1dcf8e28ebf9c8f0f408e110d7b9cd7087',
    fit: 'contain',
    position: 'center center',
    alt: '자료 대조 참고컷: 비어 있는 화이트보드와 단말, 프린터, 서류 책상',
  },
  char_dohyeon_neutral: {
    id: 'char_dohyeon_neutral',
    schemaId: 'ASSET_CHAR_DOHYEON_NEUTRAL',
    kind: 'portrait',
    status: 'received',
    sourcePath: 'art-source/originals/char_dohyun_neutral.png',
    publicPath: '/assets/char_dohyun_neutral.f6dfe34b531d.png',
    format: 'PNG',
    width: 1024,
    height: 1536,
    aspectRatio: '2:3',
    hasAlpha: true,
    sha256: 'f6dfe34b531db9c3149577ce94bf48eb414971bb6302bec78d20d825f1dea4a1',
    fit: 'contain',
    position: 'center bottom',
    alt: '박도현 중립 초상',
  },
  char_jihu_neutral: {
    id: 'char_jihu_neutral',
    schemaId: 'ASSET_CHAR_JIHU_NEUTRAL',
    kind: 'portrait',
    status: 'received',
    sourcePath: 'art-source/originals/char_jihoo_neutral.png',
    publicPath: '/assets/char_jihoo_neutral.30d0be0c641f.png',
    format: 'PNG',
    width: 1024,
    height: 1536,
    aspectRatio: '2:3',
    hasAlpha: true,
    sha256: '30d0be0c641f72c192d2bfb1f0ddcbab74188211074f5d944162b7143869fc14',
    fit: 'contain',
    position: 'center bottom',
    alt: '정지후 중립 초상',
  },
  char_eunseo_neutral: {
    id: 'char_eunseo_neutral',
    schemaId: 'ASSET_CHAR_EUNSEO_NEUTRAL',
    kind: 'portrait',
    status: 'received',
    sourcePath: 'art-source/originals/char_eunseo_neutral.png',
    publicPath: '/assets/char_eunseo_neutral.3f6c621f8a94.png',
    format: 'PNG',
    width: 1024,
    height: 1536,
    aspectRatio: '2:3',
    hasAlpha: true,
    sha256: '3f6c621f8a946c5bf0cccaf221b02172b58e9df34ae103dce394490e12b7fef9',
    fit: 'contain',
    position: 'center bottom',
    alt: '최은서 중립 초상',
  },
  char_junseok_neutral: {
    id: 'char_junseok_neutral',
    schemaId: 'ASSET_CHAR_JUNSEOK_NEUTRAL',
    kind: 'portrait',
    status: 'received',
    sourcePath: 'art-source/originals/char_junseok_neutral.png',
    publicPath: '/assets/char_junseok_neutral.1f68a9d87435.png',
    format: 'PNG',
    width: 1024,
    height: 1536,
    aspectRatio: '2:3',
    hasAlpha: true,
    sha256: '1f68a9d8743522d1bbad937933b518496874b77854793d6f0471a9d8a7286c8c',
    fit: 'contain',
    position: 'center bottom',
    alt: '오준석 중립 초상',
  },
  char_suhyeon_neutral: {
    id: 'char_suhyeon_neutral',
    schemaId: 'ASSET_CHAR_SUHYEON_NEUTRAL',
    kind: 'portrait',
    status: 'received',
    sourcePath: 'art-source/originals/char_suhyun_neutral.png',
    publicPath: '/assets/char_suhyun_neutral.c5bf2a73ce54.png',
    format: 'PNG',
    width: 1024,
    height: 1536,
    aspectRatio: '2:3',
    hasAlpha: true,
    sha256: 'c5bf2a73ce54a7b7191a87b2e955e455275de8eda8e1d267e787d0a9e3314586',
    fit: 'contain',
    position: 'center bottom',
    alt: '배수현 중립 초상',
  },
  doc_seal_envelope: {
    id: 'doc_seal_envelope',
    schemaId: 'ASSET_DOC_SEAL_ENVELOPE',
    kind: 'document',
    status: 'received',
    sourcePath: 'art-source/originals/cg_sealed_envelope.png',
    publicPath: '/assets/cg_sealed_envelope.096d00275bca.webp',
    format: 'WebP',
    width: 1672,
    height: 941,
    aspectRatio: '1672:941 (≈16:9)',
    hasAlpha: false,
    sha256: '096d00275bcad16b5794ee0345a0076d97f89aef9b6c9b0659077d96f9782b6b',
    fit: 'contain',
    position: 'center center',
    alt: '봉인된 갈색 봉투 삽화',
  },
  doc_roster_tags: {
    id: 'doc_roster_tags',
    schemaId: 'ASSET_DOC_ROSTER_TAGS',
    kind: 'document',
    status: 'unreceived',
    sourcePath: null,
    publicPath: null,
    format: null,
    width: null,
    height: null,
    aspectRatio: null,
    hasAlpha: null,
    sha256: null,
    fit: 'contain',
    position: 'center center',
    alt: '대상 명부 및 출입 태그 대조 자료 그림 (미수신)',
  },
  doc_safety_confirmation: {
    id: 'doc_safety_confirmation',
    schemaId: 'ASSET_DOC_SAFETY_CONFIRMATION',
    kind: 'document',
    status: 'unreceived',
    sourcePath: null,
    publicPath: null,
    format: null,
    width: null,
    height: null,
    aspectRatio: null,
    hasAlpha: null,
    sha256: null,
    fit: 'contain',
    position: 'center center',
    alt: '안전 확인서 서명 및 접수 도장 자료 그림 (미수신)',
  },
  doc_independent_log: {
    id: 'doc_independent_log',
    schemaId: 'ASSET_DOC_INDEPENDENT_LOG',
    kind: 'document',
    status: 'unreceived',
    sourcePath: null,
    publicPath: null,
    format: null,
    width: null,
    height: null,
    aspectRatio: null,
    hasAlpha: null,
    sha256: null,
    fit: 'contain',
    position: 'center center',
    alt: '독립 기록기 작동 이력 자료 그림 (미수신)',
  },
};

export interface BlockVisualOverride {
  readonly blockId: BlockId;
  readonly timing: 'before' | 'after';
  readonly condition?: Condition;
  readonly variantId?: VariantId;
  readonly backgroundId?: ArtAssetId | null;
  readonly portraitId?: ArtAssetId | null;
}

export interface SceneVisualMapping {
  readonly sceneId: SceneId;
  readonly inheritsFrom: SceneId | null;
  readonly backgroundId?: ArtAssetId | null;
  readonly portraitId?: ArtAssetId | null;
  readonly backgroundCaption?: string;
  readonly backgroundMode?: 'location' | 'reference';
  readonly condition?: Condition;
  readonly blockOverrides: readonly BlockVisualOverride[];
}

export const SCENE_VISUAL_MAPPINGS: Readonly<Record<SceneId, SceneVisualMapping>> = {
  // CHAPTER 01
  CH01_S01: {
    sceneId: 'CH01_S01',
    inheritsFrom: null,
    backgroundId: 'bg_archive',
    portraitId: null,
    blockOverrides: [
      { blockId: 'BLK_CH01_S01_02', timing: 'before', portraitId: 'char_dohyeon_neutral' },
      { blockId: 'BLK_CH01_S01_08', timing: 'before', portraitId: 'char_suhyeon_neutral' },
    ],
  },
  CH01_S01_A: {
    sceneId: 'CH01_S01_A',
    inheritsFrom: 'CH01_S01',
    backgroundId: 'bg_archive',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH01_S01_B: {
    sceneId: 'CH01_S01_B',
    inheritsFrom: 'CH01_S01',
    backgroundId: 'bg_archive',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH01_S02: {
    sceneId: 'CH01_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH01_S02_09', timing: 'before', portraitId: 'char_jihu_neutral' },
      { blockId: 'BLK_CH01_S02_10', timing: 'after', portraitId: 'char_yikyung_neutral' },
    ],
  },
  CH01_S02_A: {
    sceneId: 'CH01_S02_A',
    inheritsFrom: 'CH01_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH01_S02_B: {
    sceneId: 'CH01_S02_B',
    inheritsFrom: 'CH01_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },

  // CHAPTER 02
  CH02_S01: {
    sceneId: 'CH02_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH02_S01_06', timing: 'after', portraitId: 'char_suhyeon_neutral' },
    ],
  },
  CH02_S01_A: {
    sceneId: 'CH02_S01_A',
    inheritsFrom: 'CH02_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH02_S01_B: {
    sceneId: 'CH02_S01_B',
    inheritsFrom: 'CH02_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH02_S02: {
    sceneId: 'CH02_S02',
    inheritsFrom: null,
    backgroundId: 'bg_machine_room',
    backgroundMode: 'reference',
    backgroundCaption: '설비 설명 참고컷 · 기계실 (장소 이동 아님)',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [],
  },
  CH02_S02_A: {
    sceneId: 'CH02_S02_A',
    inheritsFrom: 'CH02_S02',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [],
  },
  CH02_S02_B: {
    sceneId: 'CH02_S02_B',
    inheritsFrom: 'CH02_S02',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [],
  },

  // CHAPTER 03
  CH03_S01: {
    sceneId: 'CH03_S01',
    inheritsFrom: null,
    backgroundId: 'bg_safety_room',
    backgroundMode: 'reference',
    backgroundCaption: '영상 대조 참고컷 · 안전실 (원본 CCTV 아님 · 장소 이동 아님)',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH03_S01_A: {
    sceneId: 'CH03_S01_A',
    inheritsFrom: 'CH03_S01',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH03_S01_B: {
    sceneId: 'CH03_S01_B',
    inheritsFrom: 'CH03_S01',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH03_S02: {
    sceneId: 'CH03_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH03_S02_06', timing: 'before', portraitId: 'char_jihu_neutral' },
      { blockId: 'BLK_CH03_S02_09', timing: 'before', portraitId: 'char_eunseo_neutral' },
    ],
  },
  CH03_S02_A: {
    sceneId: 'CH03_S02_A',
    inheritsFrom: 'CH03_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH03_S02_B: {
    sceneId: 'CH03_S02_B',
    inheritsFrom: 'CH03_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [],
  },
  CH03_S02_C: {
    sceneId: 'CH03_S02_C',
    inheritsFrom: 'CH03_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH03_S03: {
    sceneId: 'CH03_S03',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH03_S03_A: {
    sceneId: 'CH03_S03_A',
    inheritsFrom: 'CH03_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH03_S03_B: {
    sceneId: 'CH03_S03_B',
    inheritsFrom: 'CH03_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },

  // CHAPTER 04
  CH04_S01: {
    sceneId: 'CH04_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH04_S01_08', timing: 'before', portraitId: 'char_yikyung_neutral' },
    ],
  },
  CH04_S01_A: {
    sceneId: 'CH04_S01_A',
    inheritsFrom: 'CH04_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH04_S01_A_05', timing: 'before', portraitId: 'char_yikyung_neutral' },
    ],
  },
  CH04_S01_B: {
    sceneId: 'CH04_S01_B',
    inheritsFrom: 'CH04_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH04_S02: {
    sceneId: 'CH04_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH04_S02_A: {
    sceneId: 'CH04_S02_A',
    inheritsFrom: 'CH04_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH04_S02_A_06', timing: 'before', portraitId: 'char_yikyung_neutral' },
    ],
  },
  CH04_S02_B: {
    sceneId: 'CH04_S02_B',
    inheritsFrom: 'CH04_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },

  // CHAPTER 05
  CH05_S01: {
    sceneId: 'CH05_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH05_S01_08', timing: 'before', portraitId: 'char_jihu_neutral' },
    ],
  },
  CH05_S01_A: {
    sceneId: 'CH05_S01_A',
    inheritsFrom: 'CH05_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH05_S01_B: {
    sceneId: 'CH05_S01_B',
    inheritsFrom: 'CH05_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH05_S01_C: {
    sceneId: 'CH05_S01_C',
    inheritsFrom: 'CH05_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH05_S02: {
    sceneId: 'CH05_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH05_S02_A: {
    sceneId: 'CH05_S02_A',
    inheritsFrom: 'CH05_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_eunseo_neutral',
    condition: { op: 'trustAtLeast', characterId: 'CHAR_EUNSEO', value: 1 },
    blockOverrides: [],
  },
  CH05_S02_B: {
    sceneId: 'CH05_S02_B',
    inheritsFrom: 'CH05_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH05_S03: {
    sceneId: 'CH05_S03',
    inheritsFrom: null,
    backgroundId: 'bg_analysis_room',
    backgroundMode: 'reference',
    backgroundCaption: '자료 대조 참고컷 · 임시 증거분석실 (장소 이동 아님)',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH05_S03_A: {
    sceneId: 'CH05_S03_A',
    inheritsFrom: 'CH05_S03',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH05_S03_B: {
    sceneId: 'CH05_S03_B',
    inheritsFrom: 'CH05_S03',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },

  // CHAPTER 06
  CH06_S01: {
    sceneId: 'CH06_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH06_S01_A: {
    sceneId: 'CH06_S01_A',
    inheritsFrom: 'CH06_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH06_S01_B: {
    sceneId: 'CH06_S01_B',
    inheritsFrom: 'CH06_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH06_S02: {
    sceneId: 'CH06_S02',
    inheritsFrom: null,
    backgroundId: 'bg_guard_room',
    backgroundCaption: '현재 장면 · 휴게실',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH06_S02_A: {
    sceneId: 'CH06_S02_A',
    inheritsFrom: 'CH06_S02',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH06_S02_B: {
    sceneId: 'CH06_S02_B',
    inheritsFrom: 'CH06_S02',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH06_S02_C: {
    sceneId: 'CH06_S02_C',
    inheritsFrom: 'CH06_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },

  // CHAPTER 07
  CH07_S01: {
    sceneId: 'CH07_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [
      { blockId: 'BLK_CH07_S01_05', timing: 'before', portraitId: 'char_yikyung_neutral' },
    ],
  },
  CH07_S01_A: {
    sceneId: 'CH07_S01_A',
    inheritsFrom: 'CH07_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [],
  },
  CH07_S01_B: {
    sceneId: 'CH07_S01_B',
    inheritsFrom: 'CH07_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_junseok_neutral',
    blockOverrides: [],
  },
  CH07_S01_C: {
    sceneId: 'CH07_S01_C',
    inheritsFrom: 'CH07_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_suhyeon_neutral',
    blockOverrides: [],
  },
  CH07_S02: {
    sceneId: 'CH07_S02',
    inheritsFrom: null,
    backgroundId: 'bg_analysis_room',
    backgroundMode: 'reference',
    backgroundCaption: '자료 대조 참고컷 · 임시 증거분석실 (장소 이동 아님)',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH07_S02_A: {
    sceneId: 'CH07_S02_A',
    inheritsFrom: 'CH07_S02',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH07_S02_B: {
    sceneId: 'CH07_S02_B',
    inheritsFrom: 'CH07_S02',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH07_S03: {
    sceneId: 'CH07_S03',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH07_S03_A: {
    sceneId: 'CH07_S03_A',
    inheritsFrom: 'CH07_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [
      {
        blockId: 'BLK_CH07_S03_A_RESULT',
        timing: 'before',
        variantId: 'VAR_CH07_S03_A_HAS_E04',
        portraitId: 'char_yikyung_neutral',
      },
      {
        blockId: 'BLK_CH07_S03_A_RESULT',
        timing: 'before',
        variantId: 'VAR_CH07_S03_A_MISSING_E04',
        portraitId: 'char_dohyeon_neutral',
      },
    ],
  },
  CH07_S03_B: {
    sceneId: 'CH07_S03_B',
    inheritsFrom: 'CH07_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },

  // CHAPTER 08
  CH08_S01: {
    sceneId: 'CH08_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH08_S01_A: {
    sceneId: 'CH08_S01_A',
    inheritsFrom: 'CH08_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH08_S01_B: {
    sceneId: 'CH08_S01_B',
    inheritsFrom: 'CH08_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH08_S02: {
    sceneId: 'CH08_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH08_S02_A: {
    sceneId: 'CH08_S02_A',
    inheritsFrom: 'CH08_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH08_S02_B: {
    sceneId: 'CH08_S02_B',
    inheritsFrom: 'CH08_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH08_S03: {
    sceneId: 'CH08_S03',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH08_S03_A: {
    sceneId: 'CH08_S03_A',
    inheritsFrom: 'CH08_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [
      {
        blockId: 'BLK_CH08_S03_A_RESULT',
        timing: 'before',
        variantId: 'VAR_CH08_S03_A_COMPLETE',
        portraitId: 'char_yikyung_neutral',
      },
    ],
  },
  CH08_S03_B: {
    sceneId: 'CH08_S03_B',
    inheritsFrom: 'CH08_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH08_S03_C: {
    sceneId: 'CH08_S03_C',
    inheritsFrom: 'CH08_S03',
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },

  // CHAPTER 09
  CH09_S01: {
    sceneId: 'CH09_S01',
    inheritsFrom: null,
    backgroundId: 'bg_corridor',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH09_S01_A: {
    sceneId: 'CH09_S01_A',
    inheritsFrom: 'CH09_S01',
    backgroundId: 'bg_corridor',
    portraitId: 'char_eunseo_neutral',
    condition: { op: 'flag', flagId: 'FLAG_PRIVATE_ACCESS', equals: true },
    blockOverrides: [],
  },
  CH09_S01_B: {
    sceneId: 'CH09_S01_B',
    inheritsFrom: 'CH09_S01',
    backgroundId: 'bg_corridor',
    portraitId: 'char_eunseo_neutral',
    blockOverrides: [],
  },
  CH09_S02: {
    sceneId: 'CH09_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH09_S02_A: {
    sceneId: 'CH09_S02_A',
    inheritsFrom: 'CH09_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH09_S02_B: {
    sceneId: 'CH09_S02_B',
    inheritsFrom: 'CH09_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },

  // CHAPTER 10
  CH10_S01: {
    sceneId: 'CH10_S01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH10_S01_A: {
    sceneId: 'CH10_S01_A',
    inheritsFrom: 'CH10_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH10_S01_B: {
    sceneId: 'CH10_S01_B',
    inheritsFrom: 'CH10_S01',
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },
  CH10_S02: {
    sceneId: 'CH10_S02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH10_S02_A: {
    sceneId: 'CH10_S02_A',
    inheritsFrom: 'CH10_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_jihu_neutral',
    blockOverrides: [],
  },
  CH10_S02_B: {
    sceneId: 'CH10_S02_B',
    inheritsFrom: 'CH10_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [],
  },
  CH10_S02_C: {
    sceneId: 'CH10_S02_C',
    inheritsFrom: 'CH10_S02',
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [],
  },

  // ENDINGS
  END_TRUE: {
    sceneId: 'END_TRUE',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [
      { blockId: 'BLK_END_TRUE_10', timing: 'before', portraitId: 'char_jihu_neutral' },
      { blockId: 'BLK_END_TRUE_16', timing: 'before', portraitId: 'char_yikyung_neutral' },
      { blockId: 'BLK_END_TRUE_17', timing: 'before', portraitId: 'char_jihu_neutral' },
      { blockId: 'BLK_END_TRUE_26', timing: 'before', portraitId: 'char_yikyung_neutral' },
      { blockId: 'BLK_END_TRUE_62', timing: 'before', portraitId: 'char_jihu_neutral' },
      { blockId: 'BLK_END_TRUE_66', timing: 'before', portraitId: null },
    ],
  },
  END_GOOD: {
    sceneId: 'END_GOOD',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [
      { blockId: 'BLK_END_GOOD_12', timing: 'before', portraitId: 'char_jihu_neutral' },
      { blockId: 'BLK_END_GOOD_15', timing: 'before', portraitId: 'char_yikyung_neutral' },
      { blockId: 'BLK_END_GOOD_27', timing: 'before', portraitId: 'char_eunseo_neutral' },
      { blockId: 'BLK_END_GOOD_32', timing: 'before', portraitId: null },
    ],
  },
  END_BAD01: {
    sceneId: 'END_BAD01',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_dohyeon_neutral',
    blockOverrides: [
      { blockId: 'BLK_END_BAD01_10', timing: 'before', backgroundId: 'bg_corridor', portraitId: 'char_yikyung_neutral' },
      { blockId: 'BLK_END_BAD01_20', timing: 'before', backgroundId: 'bg_interview', portraitId: 'char_dohyeon_neutral' },
      { blockId: 'BLK_END_BAD01_25', timing: 'before', backgroundId: null, portraitId: null },
    ],
  },
  END_BAD02: {
    sceneId: 'END_BAD02',
    inheritsFrom: null,
    backgroundId: 'bg_interview',
    portraitId: 'char_yikyung_neutral',
    blockOverrides: [
      { blockId: 'BLK_END_BAD02_09', timing: 'before', backgroundId: 'bg_corridor', portraitId: 'char_yikyung_neutral' },
      { blockId: 'BLK_END_BAD02_19', timing: 'before', backgroundId: 'bg_interview', portraitId: 'char_dohyeon_neutral' },
      { blockId: 'BLK_END_BAD02_31', timing: 'before', backgroundId: 'bg_interview', portraitId: 'char_yikyung_neutral' },
      { blockId: 'BLK_END_BAD02_37', timing: 'before', portraitId: null },
    ],
  },
};

export interface ResolvedLayer {
  readonly requestedId: ArtAssetId | null;
  readonly asset: ArtAssetMetadata | null;
  readonly isReceived: boolean;
}

export interface ResolvedStageVisual {
  readonly sceneId: SceneId;
  readonly blockId: BlockId | null;
  readonly inheritsFrom: SceneId | null;
  readonly background: ResolvedLayer;
  readonly portrait: ResolvedLayer;
  readonly backgroundCaption: string | null;
  readonly backgroundMode: 'location' | 'reference';
}

function resolveLayer(id: ArtAssetId | null): ResolvedLayer {
  if (!id) return { requestedId: null, asset: null, isReceived: false };
  const asset = ART_ASSETS[id] ?? null;
  const isReceived = asset?.status === 'received' && asset.publicPath !== null;
  return {
    requestedId: id,
    asset: isReceived ? asset : null,
    isReceived,
  };
}

const PORTRAIT_CHARACTERS: Partial<Record<ArtAssetId, string>> = {
  char_dohyeon_neutral: 'CHAR_DOHYEON',
  char_jihu_neutral: 'CHAR_JIHU',
  char_eunseo_neutral: 'CHAR_EUNSEO',
  char_junseok_neutral: 'CHAR_JUNSEOK',
  char_suhyeon_neutral: 'CHAR_SUHYEON',
};

// Door-side offstage speech and recorded/message voices are not on-site appearances.
const OFFSTAGE_PORTRAIT_BLOCKS = new Set<BlockId>([
  'BLK_CH01_S02_09', 'BLK_CH01_S02_10',
  'BLK_CH05_S01_02',
  'BLK_CH06_S01_06', 'BLK_CH06_S01_07',
  'BLK_CH06_S02_A_01', 'BLK_CH06_S02_A_02',
]);

function portraitIsOnSite(id: ArtAssetId | null, state: RuntimeGameState): boolean {
  if (!id || (state.blockId && OFFSTAGE_PORTRAIT_BLOCKS.has(state.blockId))) return false;
  // Keep the existing Yi-kyung mapping; new portraits need a disclosed live introduction.
  if (id === 'char_yikyung_neutral') return true;
  const characterId = PORTRAIT_CHARACTERS[id];
  if (!characterId) return false;
  const scene = GAME_INDEX.scenes.get(state.sceneId)!;
  const introduced = (sceneId: SceneId) => GAME_INDEX.scenes.get(sceneId)!.blocks.some(
    (block) => block.kind === 'dialogue' && block.speakerId === characterId &&
      (state.revealedBlocks.has(block.id) || (sceneId === state.sceneId && state.blockId === block.id)),
  );
  const parent = SCENE_VISUAL_MAPPINGS[scene.id]!.inheritsFrom;
  return introduced(scene.id) || (parent !== null && introduced(parent));
}

/**
 * Purely resolves the current stage visual from RuntimeGameState (sceneId, blockId, blockCursor,
 * revealedBlocks, evidence, deductions, flags, relations). Never retains stale images from prior scenes.
 */
export function resolveStageVisual(
  state: RuntimeGameState,
  baseUrl = '/',
): ResolvedStageVisual & {
  readonly backgroundUrl: string | null;
  readonly portraitUrl: string | null;
} {
  const scene = GAME_INDEX.scenes.get(state.sceneId);
  if (!scene) throw new Error(`알 수 없는 장면 시각 매핑: ${state.sceneId}`);

  // Title/checkpoint states have not entered the scene and disclose no scene art.
  const mapping = SCENE_VISUAL_MAPPINGS[state.sceneId];
  if (!mapping) throw new Error(`누락된 장면 시각 매핑: ${state.sceneId}`);

  const selectedResult = mapping.inheritsFrom === null || state.choiceHistory.some(
    (choice) => choice.resultSceneId === state.sceneId,
  );
  if (state.displayStage === 'scene' || !selectedResult ||
      (mapping.condition && !evaluateCondition(mapping.condition, state))) {
    return {
      sceneId: state.sceneId,
      blockId: state.blockId,
      inheritsFrom: mapping.inheritsFrom,
      background: resolveLayer(null),
      portrait: resolveLayer(null),
      backgroundUrl: null,
      portraitUrl: null,
      backgroundCaption: null,
      backgroundMode: 'location',
    };
  }

  // Inherit base layers only. Parent block events belong to a different scene.
  const baseLayers = (id: SceneId, visiting = new Set<SceneId>()): {
    backgroundId: ArtAssetId | null; portraitId: ArtAssetId | null;
    backgroundCaption: string | null; backgroundMode: 'location' | 'reference';
  } => {
    if (visiting.has(id)) throw new Error(`순환 장면 시각 상속: ${id}`);
    visiting.add(id);
    const entry = SCENE_VISUAL_MAPPINGS[id];
    if (!entry) throw new Error(`누락된 장면 시각 상속: ${id}`);
    const parent = entry.inheritsFrom ? baseLayers(entry.inheritsFrom, visiting) : null;
    return {
      backgroundId: entry.backgroundId === undefined ? parent?.backgroundId ?? null : entry.backgroundId,
      portraitId: entry.portraitId === undefined ? parent?.portraitId ?? null : entry.portraitId,
      backgroundCaption: entry.backgroundCaption ?? (
        entry.backgroundId !== undefined && entry.backgroundId !== parent?.backgroundId
          ? null : parent?.backgroundCaption ?? null
      ),
      backgroundMode: entry.backgroundMode ?? (
        entry.backgroundId !== undefined && entry.backgroundId !== parent?.backgroundId
          ? 'location' : parent?.backgroundMode ?? 'location'
      ),
    };
  };
  let { backgroundId, portraitId, backgroundCaption, backgroundMode } = baseLayers(state.sceneId);
  const activeBlock = currentBlock(state, GAME_INDEX);
  for (const override of mapping.blockOverrides) {
    const target = scene.blocks.find((block) => block.id === override.blockId);
    if (!target) continue;
    // A skipped/future block cannot disclose art, even when the cursor is beyond it.
    const completed = state.revealedBlocks.has(target.id);
    const applies = override.timing === 'after'
      ? completed
      : completed || activeBlock?.id === target.id;
    if (!applies) continue;
    if (override.variantId && state.resolvedVariants[target.id] !== override.variantId) continue;
    if (override.condition && !evaluateCondition(override.condition, state)) continue;
    if (override.backgroundId !== undefined) backgroundId = override.backgroundId;
    if (override.portraitId !== undefined) portraitId = override.portraitId;
  }

  const background = resolveLayer(backgroundId);
  const portrait = resolveLayer(
    backgroundMode !== 'reference' && portraitIsOnSite(portraitId, state) ? portraitId : null,
  );

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const backgroundUrl =
    background.isReceived && background.asset?.publicPath
      ? `${normalizedBase}${background.asset.publicPath}`
      : null;
  const portraitUrl =
    portrait.isReceived && portrait.asset?.publicPath
      ? `${normalizedBase}${portrait.asset.publicPath}`
      : null;

  return {
    sceneId: state.sceneId,
    blockId: state.blockId,
    inheritsFrom: mapping.inheritsFrom,
    background,
    portrait,
    backgroundUrl,
    portraitUrl,
    backgroundCaption,
    backgroundMode,
  };
}
