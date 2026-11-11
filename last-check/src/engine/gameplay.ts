import { evaluateCondition } from '../content/conditions';
import type { BlockId, ChapterId, ChoiceId, SceneId, VariantId } from '../content/ids';
import type { GameContentIndex } from '../content/index';
import type { BlockDefinition, EffectDefinition, SceneDefinition } from '../content/schema';
import type { RuntimeGameState } from './state';
import { applyEffectDefinitions } from './transition';

export interface ChapterEntryCapture {
  readonly chapterId: ChapterId;
  readonly state: RuntimeGameState;
}

export function initializeContentFlags(
  state: RuntimeGameState,
  index: GameContentIndex,
): RuntimeGameState {
  let flags: Record<string, string | number | boolean | null> | undefined;
  for (const definition of index.content.flags) {
    if (Object.prototype.hasOwnProperty.call(state.flags, definition.id)) continue;
    flags ??= { ...state.flags };
    flags[definition.id] = false;
  }
  return flags ? { ...state, flags } : state;
}

function nextVisibleBlockIndex(
  scene: SceneDefinition,
  state: RuntimeGameState,
  start: number,
): number {
  return scene.blocks.findIndex((block, position) =>
    position >= start && (!block.condition || evaluateCondition(block.condition, state)),
  );
}
function sceneFor(index: GameContentIndex, sceneId: SceneId): SceneDefinition {
  const scene = index.scenes.get(sceneId);
  if (!scene) throw new Error(`구현되지 않은 scene ID: ${sceneId}`);
  return scene;
}

function effectsFor(index: GameContentIndex, effectIds: readonly string[]): EffectDefinition[] {
  return effectIds.map((effectId) => {
    const effect = index.effects.get(effectId);
    if (!effect) throw new Error(`알 수 없는 effect ID: ${effectId}`);
    return effect;
  });
}

function assertRevealPrerequisites(
  state: RuntimeGameState,
  effects: readonly EffectDefinition[],
  index: GameContentIndex,
): void {
  for (const effect of effects) {
    if (state.appliedEffects.has(effect.id)) continue;
    if (effect.condition && !evaluateCondition(effect.condition, state)) continue;
    for (const operation of effect.operations) {
      if (operation.op !== 'revealEvidenceSection') continue;
      const section = index.evidenceSections.get(operation.sectionId);
      if (!section) throw new Error(`알 수 없는 evidence section ID: ${operation.sectionId}`);
      if (!state.evidence.has(section.evidenceId)) {
        throw new Error(`획득 전 evidence section 공개 금지: ${operation.sectionId}`);
      }
    }
  }
}
function executeEffects(
  state: RuntimeGameState,
  effectIds: readonly string[],
  index: GameContentIndex,
): RuntimeGameState {
  const effects = effectsFor(index, effectIds);
  assertRevealPrerequisites(state, effects, index);
  return applyEffectDefinitions(state, effects);
}


export function resolveBlockVariant(
  block: BlockDefinition,
  state: RuntimeGameState,
): VariantId | null {
  if (block.content.type === 'fixed') return null;
  const matches = block.content.variants.filter((variant) =>
    evaluateCondition(variant.when, state),
  );
  if (matches.length !== 1) {
    throw new Error(`${block.id} 조건부 variant는 정확히 하나여야 합니다: ${matches.length}`);
  }
  return matches[0]!.id;
}

function resolveSceneVariants(
  scene: SceneDefinition,
  state: RuntimeGameState,
): Readonly<Record<BlockId, VariantId>> {
  const resolved = { ...state.resolvedVariants } as Record<BlockId, VariantId>;
  for (const block of scene.blocks) {
    if (block.content.type !== 'conditional' || resolved[block.id]) continue;
    const variantId = resolveBlockVariant(block, state);
    if (!variantId) throw new Error(`조건부 block variant 확정 실패: ${block.id}`);
    resolved[block.id] = variantId;
  }
  return resolved;
}

function enterScene(
  state: RuntimeGameState,
  scene: SceneDefinition,
  stage: 'block' | 'result',
  index: GameContentIndex,
  captures?: ChapterEntryCapture[],
): RuntimeGameState {
  if (scene.entryCondition && !evaluateCondition(scene.entryCondition, state)) {
    throw new Error(`scene 진입 조건 불충족: ${scene.id}`);
  }

  const chapter = index.content.chapters.find((item) => item.entrySceneId === scene.id);
  if (chapter && captures) {
    captures.push({
      chapterId: chapter.id,
      state: {
        ...state,
        sceneId: scene.id,
        blockId: null,
        blockCursor: 0,
        blockDisplay: 'typing',
        displayStage: 'scene',
        resolvedVariantId: null,
        blockedNextSceneId: null,
        saveRevision: Math.max(
          state.saveRevision,
          state.displayLog.at(-1)?.revision ?? 0,
          state.choiceHistory.at(-1)?.revision ?? 0,
        ),
      },
    });
  }

  const resolvedVariants = resolveSceneVariants(scene, state);
  const firstBlockIndex = nextVisibleBlockIndex(scene, state, 0);
  const firstBlock = scene.blocks[firstBlockIndex];
  if (!firstBlock) throw new Error(`표시할 block이 없는 scene: ${scene.id}`);
  const withEntryEffects = executeEffects(state, scene.entryEffectIds, index);

  return {
    ...withEntryEffects,
    sceneId: scene.id,
    blockId: firstBlock.id,
    blockCursor: firstBlockIndex,
    blockDisplay: 'typing',
    displayStage: stage,
    resolvedVariants,
    resolvedVariantId: resolvedVariants[firstBlock.id] ?? null,
    blockedNextSceneId: null,
  };
}

export function beginGame(
  state: RuntimeGameState,
  index: GameContentIndex,
  captures?: ChapterEntryCapture[],
): RuntimeGameState {
  if (state.displayStage !== 'scene' || state.blockId !== null) {
    throw new Error('이미 시작한 run입니다.');
  }
  return enterScene(initializeContentFlags(state, index), sceneFor(index, state.sceneId), 'block', index, captures);
}

export function currentBlock(
  state: RuntimeGameState,
  index: GameContentIndex,
): BlockDefinition | null {
  if (state.blockId === null) return null;
  const scene = sceneFor(index, state.sceneId);
  const block = scene.blocks[state.blockCursor];
  if (!block || block.id !== state.blockId) {
    throw new Error(`저장된 block cursor가 현재 scene과 일치하지 않습니다: ${state.blockId}`);
  }
  return block;
}

export function blockText(block: BlockDefinition, state: RuntimeGameState): string {
  if (block.content.type === 'fixed') return block.content.text;
  const variantId = state.resolvedVariants[block.id];
  if (!variantId) throw new Error(`미확정 conditional block: ${block.id}`);
  const variant = block.content.variants.find((candidate) => candidate.id === variantId);
  if (!variant) throw new Error(`저장된 variant가 block에 없습니다: ${variantId}`);
  return variant.text;
}

function completeCurrentBlock(
  state: RuntimeGameState,
  scene: SceneDefinition,
  block: BlockDefinition,
  index: GameContentIndex,
): RuntimeGameState {
  const effected = executeEffects(state, block.completionEffectIds, index);
  const revealedBlocks = new Set(effected.revealedBlocks);
  revealedBlocks.add(block.id);
  return {
    ...effected,
    blockDisplay: 'complete',
    revealedBlocks,
    displayLog: [
      ...effected.displayLog,
      {
        id: `LOG_${state.runId.slice(4)}_${state.saveRevision + 1}_${state.blockCursor}`,
        sceneId: scene.id,
        blockId: block.id,
        stage: state.displayStage,
        revision: state.saveRevision + 1,
      },
    ],
  };
}

export function continueGame(
  state: RuntimeGameState,
  index: GameContentIndex,
  captures?: ChapterEntryCapture[],
): RuntimeGameState {
  if (state.displayStage === 'complete' && state.blockedNextSceneId) {
    const previous = sceneFor(index, state.sceneId);
    if (previous.nextSceneId !== state.blockedNextSceneId) {
      throw new Error('저장된 예정 next가 원문과 다릅니다.');
    }
    if (index.scenes.has(state.blockedNextSceneId)) {
      return enterScene(initializeContentFlags(state, index), sceneFor(index, state.blockedNextSceneId), 'block', index, captures);
    }
  }
  if (state.displayStage !== 'block' && state.displayStage !== 'result') {
    throw new Error(`현재 단계에서는 block 진행 불가: ${state.displayStage}`);
  }
  if (state.blockDisplay !== 'typing') {
    throw new Error(`현재 block은 이미 완료되었습니다: ${state.blockId ?? 'none'}`);
  }
  const scene = sceneFor(index, state.sceneId);
  const block = currentBlock(state, index);
  if (!block) throw new Error('현재 block이 없습니다.');
  const completed = completeCurrentBlock(state, scene, block, index);
  const nextBlockIndex = nextVisibleBlockIndex(scene, completed, state.blockCursor + 1);
  const nextBlock = scene.blocks[nextBlockIndex];

  if (nextBlock) {
    return {
      ...completed,
      blockId: nextBlock.id,
      blockCursor: nextBlockIndex,
      blockDisplay: 'typing',
      resolvedVariantId: completed.resolvedVariants[nextBlock.id] ?? null,
    };
  }

  if (scene.choices.length > 0) {
    return {
      ...completed,
      blockId: null,
      blockDisplay: 'complete',
      displayStage: 'choice',
      resolvedVariantId: null,
    };
  }

  let nextSceneId = scene.nextSceneId;
  if (scene.nextVariants) {
    const matches = scene.nextVariants.filter((route) => evaluateCondition(route.when, completed));
    if (matches.length !== 1) throw new Error(`다음 경로는 정확히 하나여야 합니다: ${scene.id}`);
    nextSceneId = matches[0]!.sceneId;
  }
  if (nextSceneId) {
    if (index.unimplementedScenes.has(nextSceneId)) {
      return {
        ...completed,
        blockId: null,
        blockDisplay: 'complete',
        displayStage: 'complete',
        resolvedVariantId: null,
        blockedNextSceneId: nextSceneId,
      };
    }
    return enterScene(completed, sceneFor(index, nextSceneId), 'block', index, captures);
  }

  return {
    ...completed,
    blockId: null,
    blockDisplay: 'complete',
    displayStage: 'complete',
    resolvedVariantId: null,
  };
}

export function choose(
  state: RuntimeGameState,
  choiceId: ChoiceId,
  index: GameContentIndex,
  captures?: ChapterEntryCapture[],
): RuntimeGameState {
  if (state.displayStage !== 'choice' || state.blockId !== null) {
    throw new Error(`현재 단계에서는 선택 불가: ${state.displayStage}`);
  }
  const scene = sceneFor(index, state.sceneId);
  if (state.choiceHistory.some((entry) => entry.sceneId === scene.id)) {
    throw new Error(`이미 확정한 선택 장면입니다: ${scene.id}`);
  }
  const choice = scene.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`현재 scene에서 허용되지 않은 choice ID: ${choiceId}`);
  if (choice.condition && !evaluateCondition(choice.condition, state)) {
    throw new Error(`choice 조건 불충족: ${choiceId}`);
  }

  const resultScene = sceneFor(index, choice.resultSceneId);
  const resolvedVariants = resolveSceneVariants(resultScene, state);
  const preEffectState = { ...state, resolvedVariants };
  const effected = executeEffects(preEffectState, choice.effectIds, index);
  const entered = enterScene(effected, resultScene, 'result', index, captures);
  return {
    ...entered,
    choiceHistory: [
      ...entered.choiceHistory,
      {
        choiceId,
        sceneId: scene.id,
        resultSceneId: resultScene.id,
        revision: state.saveRevision + 1,
      },
    ],
  };
}

export function withSaveRevision(state: RuntimeGameState): RuntimeGameState {
  return { ...state, saveRevision: state.saveRevision + 1 };
}
