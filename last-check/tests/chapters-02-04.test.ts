import { describe, expect, it } from 'vitest';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import type { CharacterId, ChoiceId, SceneId } from '../src/content/ids';
import { gameReducer } from '../src/engine/reducer';
import { createInitialState, type RelationState, type RuntimeGameState } from '../src/engine/state';

const characterIds = GAME_CONTENT.characters.map((character) => character.id);

type RelationOverrides = Partial<Record<CharacterId, RelationState>>;

function beginAt(sceneId: SceneId, relationOverrides: RelationOverrides = {}): RuntimeGameState {
  const initial = createInitialState({
    runId: `RUN_${sceneId}`,
    sceneId,
    seed: 734,
    characterIds,
  });
  const relations: Record<CharacterId, RelationState> = { ...initial.relations };
  for (const [characterId, relation] of Object.entries(relationOverrides)) {
    if (relation) relations[characterId] = relation;
  }
  return gameReducer(
    {
      ...initial,
      relations,
    },
    { type: 'begin' },
  );
}

function continueBlocks(state: RuntimeGameState, count: number): RuntimeGameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = gameReducer(next, { type: 'continueBlock' });
  }
  return next;
}

function reachChoice(state: RuntimeGameState): RuntimeGameState {
  const scene = GAME_INDEX.scenes.get(state.sceneId)!;
  return continueBlocks(state, scene.blocks.length - state.blockCursor);
}

function choose(state: RuntimeGameState, choiceId: ChoiceId): RuntimeGameState {
  return gameReducer(state, { type: 'choose', choiceId, sceneId: state.sceneId });
}

const cases = [
  { scene: 'CH02_S01', choice: 'C03_A', result: 'CH02_S01_A', next: 'CH02_S02', relation: [['CHAR_IKYEONG', 'suspicion', 1]], note: 'NOTE_CH02_C03_A_LEDGER' },
  { scene: 'CH02_S01', choice: 'C03_B', result: 'CH02_S01_B', next: 'CH02_S02', relation: [['CHAR_SUHYEON', 'trust', 1]], evidence: 'E11', section: 'ESECTION_E11_INQUIRY' },
  { scene: 'CH02_S02', choice: 'C04_A', result: 'CH02_S02_A', next: 'CH03_S01', relation: [['CHAR_JUNSEOK', 'trust', 1]], evidence: 'E04', section: 'ESECTION_E04_MODE' },
  { scene: 'CH02_S02', choice: 'C04_B', result: 'CH02_S02_B', next: 'CH03_S01', relation: [['CHAR_JUNSEOK', 'trust', -1], ['CHAR_JUNSEOK', 'suspicion', 1]] },
  { scene: 'CH03_S01', choice: 'C05_A', result: 'CH03_S01_A', next: 'CH03_S02', relation: [['CHAR_JIHU', 'trust', 1], ['CHAR_JIHU', 'suspicion', 0]], initial: { CHAR_JIHU: { trust: 0, suspicion: 1 } }, evidence: 'E03', section: 'ESECTION_E03_VERIFICATION' },
  { scene: 'CH03_S01', choice: 'C05_B', result: 'CH03_S01_B', next: 'CH03_S02', relation: [['CHAR_JIHU', 'suspicion', 1]], note: 'NOTE_CH03_C05_B_WORK' },
  { scene: 'CH03_S02', choice: 'C06_A', result: 'CH03_S02_A', next: 'CH03_S03', relation: [['CHAR_SUHYEON', 'trust', 1]], note: 'NOTE_CH03_C06_A_RECEIPT' },
  { scene: 'CH03_S02', choice: 'C06_B', result: 'CH03_S02_B', next: 'CH03_S03', relation: [['CHAR_JIHU', 'suspicion', 1]], note: 'NOTE_CH03_C06_B_WITNESS' },
  { scene: 'CH03_S02', choice: 'C06_C', result: 'CH03_S02_C', next: 'CH03_S03', relation: [['CHAR_EUNSEO', 'trust', 1]], note: 'NOTE_CH03_C06_C_ORIGINAL' },
  { scene: 'CH03_S03', choice: 'C07_A', result: 'CH03_S03_A', next: 'CH04_S01', relation: [['CHAR_EUNSEO', 'trust', 1]], note: 'NOTE_CH03_C07_A_PRIVATE' },
  { scene: 'CH03_S03', choice: 'C07_B', result: 'CH03_S03_B', next: 'CH04_S01', relation: [['CHAR_EUNSEO', 'trust', -1]], note: 'NOTE_CH03_C07_B_LIMIT' },
  { scene: 'CH04_S01', choice: 'C08_A', result: 'CH04_S01_A', next: 'CH04_S02', relation: [['CHAR_JIHU', 'suspicion', 1]], note: 'NOTE_CH04_C08_A_BASIS' },
  { scene: 'CH04_S01', choice: 'C08_B', result: 'CH04_S01_B', next: 'CH04_S02', relation: [['CHAR_SUHYEON', 'trust', -1], ['CHAR_JUNSEOK', 'trust', -1], ['CHAR_SUHYEON', 'suspicion', 1]] },
  { scene: 'CH04_S02', choice: 'C09_A', result: 'CH04_S02_A', next: 'CH05_S01', relation: [['CHAR_JUNSEOK', 'trust', 1]], evidence: 'E07', section: 'ESECTION_E07_HISTORY' },
  { scene: 'CH04_S02', choice: 'C09_B', result: 'CH04_S02_B', next: 'CH05_S01', relation: [['CHAR_IKYEONG', 'suspicion', 1]], note: 'NOTE_CH04_C09_B_CONFESSION' },
] as const;

describe('CH02–CH04 gameplay', () => {
  it.each(cases)('$choice follows its result and original next with one effect application', (testCase) => {
    const atChoice = reachChoice(beginAt(testCase.scene, 'initial' in testCase ? testCase.initial : {}));
    const selected = choose(atChoice, testCase.choice);

    expect(selected.sceneId).toBe(testCase.result);
    expect([...selected.appliedEffects].filter((id) => id === `FX_${testCase.choice}`)).toHaveLength(1);
    for (const [characterId, field, value] of testCase.relation) {
      expect(selected.relations[characterId]![field]).toBe(value);
    }
    if ('evidence' in testCase) expect(selected.evidence.has(testCase.evidence)).toBe(true);
    if ('section' in testCase) expect(selected.revealedEvidenceSections.has(testCase.section)).toBe(false);
    if ('note' in testCase) expect(selected.revealedNotebookEntries.has(testCase.note)).toBe(false);

    const resultScene = GAME_INDEX.scenes.get(selected.sceneId)!;
    const beforeFinalBlock = continueBlocks(selected, resultScene.blocks.length - 1);
    if ('section' in testCase) expect(beforeFinalBlock.revealedEvidenceSections.has(testCase.section)).toBe(false);
    if ('note' in testCase) expect(beforeFinalBlock.revealedNotebookEntries.has(testCase.note)).toBe(false);

    const completed = continueBlocks(beforeFinalBlock, 1);
    if ('section' in testCase) expect(completed.revealedEvidenceSections.has(testCase.section)).toBe(true);
    if ('note' in testCase) expect(completed.revealedNotebookEntries.has(testCase.note)).toBe(true);
    expect(completed.sceneId).toBe(testCase.next);
    expect(completed.blockedNextSceneId).toBeNull();
  });

  it.each([
    ['CH03_S01', 'E03', 'ESECTION_E03_VIDEO', 'FX_CH03_ENTRY_E03'],
    ['CH03_S02', 'E05', 'ESECTION_E05_ROSTER', 'FX_CH03_ENTRY_E05'],
    ['CH04_S01', 'E06', 'ESECTION_E06_CONFIRMATION', 'FX_CH04_ENTRY_E06'],
  ] as const)('%s acquires common evidence but hides its full section until the source block completes', (sceneId, evidenceId, sectionId, effectId) => {
    const started = beginAt(sceneId);
    const scene = GAME_INDEX.scenes.get(sceneId)!;

    expect(started.evidence.has(evidenceId)).toBe(true);
    expect(started.revealedEvidenceSections.has(sectionId)).toBe(false);

    const beforeEvidenceBlockCompletes = continueBlocks(started, scene.blocks.length - 2);
    expect(beforeEvidenceBlockCompletes.revealedEvidenceSections.has(sectionId)).toBe(false);

    const revealed = continueBlocks(beforeEvidenceBlockCompletes, 1);
    expect(revealed.revealedEvidenceSections.has(sectionId)).toBe(true);
    expect([...revealed.appliedEffects].filter((id) => id === effectId)).toHaveLength(1);
  });

  it('keeps the 19:41 sealed output separate from the later recorder supplement', () => {
    const sealed = GAME_INDEX.evidenceSections.get('ESECTION_E02_ENVELOPE')!.body;
    const history = GAME_INDEX.evidenceSections.get('ESECTION_E07_HISTORY')!.body;

    expect(sealed).not.toContain('19:46');
    expect(sealed).not.toContain('HAND 변경');
    expect(history).toContain('19:46:02 — HAND 변경, 이동 신호 없음');
    expect(history).toContain('최초 봉인 출력의 앞 두 행');
    expect(history).toContain('7시 46분 행은 그 뒤에도 계속 남은 원본 이력에서 보완한 겁니다.');
  });

  it('ignores a repeated stale choice without applying its evidence or trust twice', () => {
    const atChoice = reachChoice(beginAt('CH02_S01'));
    const selected = gameReducer(atChoice, { type: 'choose', choiceId: 'C03_B', sceneId: 'CH02_S01' });
    const replayed = gameReducer(selected, { type: 'choose', choiceId: 'C03_B', sceneId: 'CH02_S01' });

    expect(replayed).toBe(selected);
    expect(replayed.relations.CHAR_SUHYEON!.trust).toBe(1);
    expect([...replayed.evidence].filter((id) => id === 'E11')).toHaveLength(1);
  });
});
