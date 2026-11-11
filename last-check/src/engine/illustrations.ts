import type { BlockId, ChoiceId, EvidenceSectionId, SceneId } from '../content/ids';
import type { RuntimeGameState } from './state';
import { ART_ASSETS, type ArtAssetId, type ArtAssetMetadata } from './visuals';

interface IllustrationCue {
  readonly assetId: ArtAssetId;
  readonly sceneId: SceneId;
  readonly blockId: BlockId;
  readonly choiceId?: ChoiceId;
  readonly sectionId?: EvidenceSectionId;
  readonly timing?: 'before' | 'after';
  readonly endingOutcome?: 'TRUE' | 'GOOD' | 'BAD01' | 'BAD02';
  readonly hideAtBlockId?: BlockId;
  readonly caption: string;
}

export const ILLUSTRATION_CUES: readonly IllustrationCue[] = [
  { assetId: 'doc_seal_envelope', sceneId: 'CH01_S01', blockId: 'BLK_CH01_S01_08', caption: '자료 삽화 · 봉인 봉투 (정확한 표기는 원문 참조)' },
  { assetId: 'cg_cctv_safety', sceneId: 'CH03_S01', blockId: 'BLK_CH03_S01_01', caption: '영상 대조 삽화 · 단일 참고 이미지 (시각·연속성·알리바이는 원문 기록으로 확인)' },
  { assetId: 'cg_letter', sceneId: 'CH09_S01_A', blockId: 'BLK_CH09_S01_A_02', choiceId: 'C21_A', sectionId: 'ESECTION_E14_02', caption: '자료 삽화 · 편지 (장소 이동 아님 · 문서·서명·시각은 원문 참조)' },
  { assetId: 'cg_notebook', sceneId: 'CH09_S02_A', blockId: 'BLK_CH09_S02_A_05', choiceId: 'C22_A', sectionId: 'ESECTION_E16_05', caption: '자료 삽화 · 수첩 (정확한 문장은 원문 참조)' },
  { assetId: 'end_true', sceneId: 'END_TRUE', blockId: 'BLK_END_TRUE_71', timing: 'before', endingOutcome: 'TRUE', caption: '마지막 장면 삽화 · 정확한 기록과 결말은 원문 참조' },
  { assetId: 'end_good', sceneId: 'END_GOOD', blockId: 'BLK_END_GOOD_31', timing: 'before', endingOutcome: 'GOOD', caption: '마지막 장면 참고컷 · 서류와 닫힌 봉투 (가족사진은 원문 참조)' },
  { assetId: 'end_bad01', sceneId: 'END_BAD01', blockId: 'BLK_END_BAD01_24', timing: 'before', endingOutcome: 'BAD01', hideAtBlockId: 'BLK_END_BAD01_25', caption: '마지막 장면 삽화 · 영상 인물은 현장 배치나 새로운 증명이 아님' },
  { assetId: 'end_bad02', sceneId: 'END_BAD02', blockId: 'BLK_END_BAD02_37', timing: 'before', endingOutcome: 'BAD02', caption: '마지막 장면 참고컷 · 재수사 시작 (유죄확정 아님)' },
];

export interface StageIllustration {
  readonly asset: ArtAssetMetadata;
  readonly url: string;
  readonly caption: string | null;
}

function assetUrl(assetId: ArtAssetId, baseUrl: string): string | null {
  const asset = ART_ASSETS[assetId];
  if (asset.status !== 'received' || !asset.publicPath) return null;
  return `${baseUrl.replace(/\/$/, '')}${asset.publicPath}`;
}

function cueIsOnSelectedPath(cue: IllustrationCue, state: RuntimeGameState): boolean {
  if (state.displayStage === 'scene') return false;
  if (cue.hideAtBlockId && (state.blockId === cue.hideAtBlockId || state.revealedBlocks.has(cue.hideAtBlockId))) return false;
  if (cue.endingOutcome) {
    return state.sceneId === cue.sceneId && state.flags.FLAG_OUTCOME === cue.endingOutcome &&
      state.choiceHistory.some((choice) => choice.sceneId === 'CH10_S02' &&
        choice.choiceId === `C24_${state.flags.FLAG_FINAL_CHOICE}` &&
        choice.resultSceneId === `CH10_S02_${state.flags.FLAG_FINAL_CHOICE}`);
  }
  if (cue.choiceId) {
    return state.sceneId === cue.sceneId && state.choiceHistory.some(
      (choice) => choice.choiceId === cue.choiceId && choice.resultSceneId === cue.sceneId,
    );
  }
  return state.sceneId === cue.sceneId || state.choiceHistory.some(
    (choice) => choice.sceneId === cue.sceneId && choice.resultSceneId === state.sceneId,
  );
}

/** Presentation only: no acquisition, effect, log or notebook mutations. */
export function resolveStageIllustration(state: RuntimeGameState, baseUrl = '/'): StageIllustration | null {
  if (state.displayStage === 'scene' && state.sceneId === 'CH01_S01' &&
      state.blockId === null && state.choiceHistory.length === 0) {
    const url = assetUrl('title_main', baseUrl);
    return url ? { asset: ART_ASSETS.title_main, url, caption: null } : null;
  }
  const cue = ILLUSTRATION_CUES.find((cue) => cueIsOnSelectedPath(cue, state) &&
    (state.revealedBlocks.has(cue.blockId) || (cue.timing === 'before' && state.blockId === cue.blockId)) &&
    (!cue.sectionId || state.revealedEvidenceSections.has(cue.sectionId)));
  if (!cue) return null;
  const url = assetUrl(cue.assetId, baseUrl);
  return url ? { asset: ART_ASSETS[cue.assetId], url, caption: cue.caption } : null;
}

/** Only the active disclosure block may warm its already-selected, immediately upcoming cut.
 * Returns no alt/text and creates no hidden DOM or speculative branch requests. */
export function upcomingIllustrationUrl(state: RuntimeGameState, baseUrl = '/'): string | null {
  if (resolveStageIllustration(state, baseUrl)) return null;
  const cue = ILLUSTRATION_CUES.find((cue) => cueIsOnSelectedPath(cue, state) &&
    state.blockId === cue.blockId && !state.revealedBlocks.has(cue.blockId));
  return cue ? assetUrl(cue.assetId, baseUrl) : null;
}
