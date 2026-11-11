import assert from 'node:assert/strict';
import { GAME_CONTENT, GAME_INDEX } from '../../src/content/game-content';
import type { ChoiceId, SceneId } from '../../src/content/ids';
import { gameReducer } from '../../src/engine/reducer';
import { createInitialState, serializeGameState, type RuntimeGameState } from '../../src/engine/state';

export function beginAt(sceneId: SceneId = 'CH01_S01'): RuntimeGameState {
  return gameReducer(createInitialState({
    runId:'RUN_DECISION_VERIFICATION',sceneId,seed:917,
    characterIds:GAME_CONTENT.characters.map(c=>c.id),
  }),{type:'begin'});
}
export function advance(state: RuntimeGameState): RuntimeGameState {
  return gameReducer(state,{type:'continueBlock',blockId:state.blockId});
}
export function toBoundary(state: RuntimeGameState, onScene?: (sceneId: string)=>void): RuntimeGameState {
  const visited=new Set<string>();
  while(state.displayStage==='block'||state.displayStage==='result') {
    onScene?.(state.sceneId);
    if(state.sceneId.startsWith('END_')) return state;
    const cursor=`${state.sceneId}:${state.blockId}:${state.blockCursor}`;
    assert(!visited.has(cursor),`unintended block/scene loop: ${cursor}`);
    visited.add(cursor);
    state=advance(state);
  }
  onScene?.(state.sceneId);
  return state;
}
export function choiceState(sceneId: SceneId): RuntimeGameState {
  const state=toBoundary(beginAt(sceneId));
  assert.equal(state.displayStage,'choice');
  return state;
}
export function select(state: RuntimeGameState, choiceId: ChoiceId): RuntimeGameState {
  return gameReducer(state,{type:'choose',choiceId,sceneId:state.sceneId});
}
export function finishResult(state: RuntimeGameState): RuntimeGameState {
  const sceneId=state.sceneId;
  const visited=new Set<string>();
  while(state.sceneId===sceneId && (state.displayStage==='block'||state.displayStage==='result')) {
    const cursor=`${state.sceneId}:${state.blockId}`;
    assert(!visited.has(cursor),`result loop: ${cursor}`);
    visited.add(cursor);
    state=advance(state);
  }
  return state;
}
export function finishEnding(state: RuntimeGameState): RuntimeGameState {
  assert(state.sceneId.startsWith('END_'));
  const entered=state;
  const visited=new Set<string>();
  while(state.displayStage!=='complete') {
    assert.equal(state.sceneId,entered.sceneId);
    assert(state.blockId && !visited.has(state.blockId),'ending block loop');
    visited.add(state.blockId);
    state=advance(state);
  }
  assert.equal(GAME_INDEX.scenes.get(state.sceneId)?.endCommand,'TITLE');
  assert.deepEqual(state.evidence,entered.evidence,'ending grants retroactive evidence');
  assert.deepEqual(state.deductions,entered.deductions,'ending grants retroactive deduction');
  return state;
}
export function play(route: readonly string[]): RuntimeGameState {
  let state=toBoundary(beginAt());
  for(const choiceId of route) {
    assert.equal(state.displayStage,'choice',`route stopped before ${choiceId}`);
    state=toBoundary(select(state,choiceId));
  }
  assert(state.sceneId.startsWith('END_'),'route does not reach an ending');
  return state;
}
export function assertDeniedUnchanged(state: RuntimeGameState, choiceId: ChoiceId): void {
  const before=serializeGameState(state);
  assert.throws(()=>select(state,choiceId),/choice 조건 불충족/);
  assert.equal(serializeGameState(state),before,`denied input mutates state: ${choiceId}`);
}
