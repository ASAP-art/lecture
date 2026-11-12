import assert from 'node:assert/strict';
import { GAME_INDEX } from '../../src/content/game-content';
import { saveSessionReducer } from '../../src/engine/save-session';
import { SaveRepository, SAVE_KEY } from '../../src/engine/storage';
import { TRUE_WITNESS } from '../fixtures/decision-oracle';
import { advanceSession, freshSession, MemoryStorage, selectSession, SerialLocks } from './save-play';

// Boundary fixtures replay real engine choices; browser tests label injection separately from UI play.
const targetBlockId = process.argv[2];
assert(targetBlockId, 'A target block is required');
const targetScene = [...GAME_INDEX.scenes.values()].find(scene => scene.blocks.some(block => block.id === targetBlockId));
assert(targetScene, `Unknown target block: ${targetBlockId}`);
let session = saveSessionReducer(freshSession('RUN_SPRITE_BROWSER'), { type: 'begin' });
for (let step = 0; session.game.blockId !== targetBlockId && step < 800; step += 1) {
  if (session.game.blockId) {
    session = advanceSession(session);
    continue;
  }
  assert.equal(session.game.displayStage, 'choice', `Route ended before ${targetBlockId}`);
  const scene = GAME_INDEX.scenes.get(session.game.sceneId)!;
  const choice: (typeof scene.choices)[number] | undefined = scene.choices.find(candidate => candidate.resultSceneId === targetScene.id) ??
    scene.choices.find(candidate => candidate.id === TRUE_WITNESS[session.game.choiceHistory.length]);
  assert(choice, `No real choice route to ${targetBlockId}`);
  session = selectSession(session, choice.id);
}
assert.equal(session.game.blockId, targetBlockId);
const storage = new MemoryStorage();
await new SaveRepository(storage, new SerialLocks()).saveSession(session);
process.stdout.write(storage.getItem(SAVE_KEY)!);
