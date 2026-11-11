import type { BlockId, ChoiceId, SceneId } from '../content/ids';
import { GAME_INDEX } from '../content/game-content';
import { createInitialState, type RuntimeGameState } from './state';
import { beginGame, choose, continueGame, initializeContentFlags, withSaveRevision, type ChapterEntryCapture } from './gameplay';

export type GameAction =
  | { type: 'begin' }
  | { type: 'continueBlock'; blockId?: BlockId | null }
  | { type: 'choose'; choiceId: ChoiceId; sceneId?: SceneId }
  | { type: 'title'; runId: string; seed: number; force?: boolean; parentRunId?: string | null };

export function gameReducer(
  state: RuntimeGameState,
  action: GameAction,
  captures?: ChapterEntryCapture[],
): RuntimeGameState {
  switch (action.type) {
    case 'begin':
      return state.displayStage === 'scene'
        ? withSaveRevision(beginGame(state, GAME_INDEX, captures))
        : state;
    case 'continueBlock':
      if (action.blockId !== undefined && action.blockId !== state.blockId) return state;
      return withSaveRevision(continueGame(state, GAME_INDEX, captures));
    case 'choose':
      if (action.sceneId && action.sceneId !== state.sceneId) return state;
      return withSaveRevision(choose(state, action.choiceId, GAME_INDEX, captures));
    case 'title':
      if (action.force !== true && (state.displayStage !== 'complete' || GAME_INDEX.scenes.get(state.sceneId)?.endCommand !== 'TITLE')) {
        throw new Error('종료 화면에서만 TITLE 명령을 실행할 수 있습니다.');
      }
      return withSaveRevision(initializeContentFlags(createInitialState({
        runId: action.runId,
        parentRunId: action.parentRunId !== undefined ? action.parentRunId : state.runId,
        seed: action.seed,
        sceneId: GAME_INDEX.content.chapters[0]!.entrySceneId,
        characterIds: GAME_INDEX.content.characters.map((character) => character.id),
      }), GAME_INDEX));
  }
}
