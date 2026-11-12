import { GAME_INDEX } from '../content/game-content';
import type { BlockId, SceneId } from '../content/ids';
import type { BlockDefinition } from '../content/schema';
import { blockText } from '../engine/gameplay';
import type { RuntimeGameState } from '../engine/state';

export interface DialogueReviewEntry {
  readonly id: string;
  readonly sceneId: SceneId;
  readonly blockId: BlockId;
  readonly kind: BlockDefinition['kind'];
  readonly text: string;
}

/** Completed text since the last confirmed choice, without replaying any gameplay. */
export function getDialogueReviewEntries(state: RuntimeGameState): DialogueReviewEntry[] {
  const boundary = state.choiceHistory.at(-1)?.revision ?? -1;
  const entries: DialogueReviewEntry[] = [];

  for (const log of state.displayLog) {
    if (log.revision <= boundary || !log.blockId || !state.revealedBlocks.has(log.blockId)) continue;
    const scene = GAME_INDEX.scenes.get(log.sceneId);
    const block = scene?.blocks.find((candidate) => candidate.id === log.blockId);
    if (!block) continue;
    // Historical text uses only the saved resolution, never today's holdings or conditions.
    if (block.content.type === 'conditional'
      && !block.content.variants.some((variant) => variant.id === state.resolvedVariants[block.id])) continue;

    entries.push({
      id: log.id,
      sceneId: log.sceneId,
      blockId: block.id,
      kind: block.kind,
      text: blockText(block, state),
    });
  }

  return entries;
}
