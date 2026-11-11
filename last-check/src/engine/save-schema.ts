import { z } from 'zod';
import { GAME_CONTENT, GAME_INDEX } from '../content/game-content';
import { evaluateCondition } from '../content/conditions';
import { ChapterIdSchema, RunIdSchema } from '../content/ids';
import { SOURCE_SHA256 } from '../content/source';
import { fromPersistedGameState, PersistedGameStateSchema, type PersistedGameState } from './state';

export const STORE_VERSION = 1 as const;
const Revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1);
export const RunRecordSchema = z.object({
  runId: RunIdSchema,
  parentRunId: RunIdSchema.nullable(),
  entries: z.record(ChapterIdSchema, PersistedGameStateSchema),
  protected: PersistedGameStateSchema.nullable(),
  completed: PersistedGameStateSchema.nullable(),
}).strict();
export type RunRecord = z.infer<typeof RunRecordSchema>;
const SlotSchema = z.object({ state: PersistedGameStateSchema, savedAt: z.number().int().nonnegative() }).strict();
export type SaveSlot = z.infer<typeof SlotSchema>;
export const SaveDocumentSchema = z.object({
  version: z.literal(STORE_VERSION),
  sourceHash: z.literal(SOURCE_SHA256),
  revision: Revision,
  auto: SlotSchema.nullable(),
  manual: z.tuple([SlotSchema.nullable(), SlotSchema.nullable(), SlotSchema.nullable()]),
  runs: z.record(RunIdSchema, RunRecordSchema),
}).strict();
export type SaveDocument = z.infer<typeof SaveDocumentSchema>;
export function emptySaveDocument(): SaveDocument {
  return { version: STORE_VERSION, sourceHash: SOURCE_SHA256, revision: 0, auto: null, manual: [null, null, null], runs: {} };
}

function requireValid(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`저장 무결성: ${reason}`);
}
const chapterOrder = new Map(GAME_CONTENT.chapters.map((c, i) => [c.id, i]));
const sceneForBlock = new Map(GAME_CONTENT.chapters.flatMap(c => c.scenes.flatMap(s => s.blocks.map(b => [b.id, s] as const))));
const choices = new Map(GAME_CONTENT.chapters.flatMap(c => c.scenes.flatMap(s => s.choices.map(choice => [choice.id, { choice, scene: s }] as const))));
const characterIds = new Set(GAME_CONTENT.characters.map(c => c.id));
const deductionIds = new Set(GAME_CONTENT.deductions.map(d => d.id));
const flagIds = new Set(GAME_CONTENT.flags.map(f => f.id));
const effectChapters = new Map<string, number[]>();
const effectScenes = new Map<string, Set<string>>();
const effectChoices = new Map<string, Set<string>>();
const effectBlocks = new Map<string, Set<string>>();
for (const chapter of GAME_CONTENT.chapters) {
  for (const scene of chapter.scenes) {
    const ids = [...scene.entryEffectIds, ...scene.choices.flatMap(c => c.effectIds), ...scene.blocks.flatMap(b => b.completionEffectIds)];
    for (const id of ids) {
      effectChapters.set(id, [...effectChapters.get(id) ?? [], chapterOrder.get(chapter.id)!]);
      const origins = effectScenes.get(id) ?? new Set<string>();
      origins.add(scene.id); effectScenes.set(id, origins);
    }
    for (const choice of scene.choices) for (const id of choice.effectIds) {
      const origins = effectChoices.get(id) ?? new Set<string>();
      origins.add(choice.id); effectChoices.set(id, origins);
    }
    for (const block of scene.blocks) for (const id of block.completionEffectIds) {
      const origins = effectBlocks.get(id) ?? new Set<string>();
      origins.add(block.id); effectBlocks.set(id, origins);
    }
  }
}

function reachedScenes(state: PersistedGameState): Set<string> {
  const reached = new Set<string>();
  let cursor: string = GAME_CONTENT.chapters[0]!.entrySceneId;
  for (const [position, history] of state.choiceHistory.entries()) {
    const actual = choices.get(history.choiceId);
    requireValid(actual && cursor === history.sceneId && actual.scene.id === cursor && actual.choice.resultSceneId === history.resultSceneId, '실제 선택 경로 불일치');
    reached.add(cursor);
    cursor = actual.choice.resultSceneId; reached.add(cursor);
    if (position === state.choiceHistory.length - 1 && cursor === state.sceneId) return reached;
    const result = GAME_INDEX.scenes.get(cursor)!;
    let next: string | undefined = result.nextSceneId;
    if (result.nextVariants) {
      const routes = result.nextVariants.filter(route => evaluateCondition(route.when, fromPersistedGameState(state)));
      requireValid(routes.length === 1, '저장된 다음 분기 불일치');
      next = routes[0]!.sceneId;
    }
    requireValid(next, '선택 경로 next 누락');
    cursor = next;
  }
  requireValid(cursor === state.sceneId, '이력 이후 장면 불일치');
  reached.add(cursor);
  return reached;
}

/** Validates stored IDs and cross-field invariants, without re-evaluating frozen variants against post-effect state. */
export function validateSnapshot(input: unknown): PersistedGameState {
  const s = PersistedGameStateSchema.parse(input);
  requireValid(Number.isSafeInteger(s.saveRevision), 'revision 범위');
  requireValid(s.runId !== s.parentRunId, '자기 자신을 부모로 지정');
  const scene = GAME_INDEX.scenes.get(s.sceneId);
  requireValid(scene, '알 수 없는 장면');
  const reached = reachedScenes(s);
  for (const id of s.evidence) requireValid(GAME_INDEX.evidence.has(id), '알 수 없는 증거');
  for (const id of s.deductions) requireValid(deductionIds.has(id), '알 수 없는 추리');
  requireValid(Object.keys(s.relations).length === characterIds.size, '인물 관계 누락');
  for (const id of Object.keys(s.relations)) requireValid(characterIds.has(id), '알 수 없는 인물');
  requireValid(Object.keys(s.flags).length === flagIds.size, 'flag 누락');
  for (const [id, value] of Object.entries(s.flags)) {
    requireValid(flagIds.has(id), '알 수 없는 flag');
    requireValid(value === false || GAME_CONTENT.effects.some(e => e.operations.some(op => op.op === 'setFlag' && op.flagId === id && op.value === value)), '선언되지 않은 flag 값');
  }
  const effects = new Set(s.appliedEffects);
  const evidence = new Set(s.evidence);
  const deductions = new Set(s.deductions);
  const revealed = new Set(s.revealedBlocks);
  const sections = new Set(s.revealedEvidenceSections);
  const notes = new Set(s.revealedNotebookEntries);
  for (const id of effects) {
    requireValid([...effectScenes.get(id) ?? []].some(sceneId => reached.has(sceneId)), '도달 전/다른 결과 효과 혼입');
    if (effectChoices.has(id)) requireValid(s.choiceHistory.some(h => effectChoices.get(id)!.has(h.choiceId)), '선택 전 보상 효과');
    if (effectBlocks.has(id)) requireValid([...effectBlocks.get(id)!].some(blockId => revealed.has(blockId)), '블록 완료 전 효과');
  }
  for (const id of effects) {
    const effect = GAME_INDEX.effects.get(id);
    requireValid(effect, '알 수 없는 적용 효과');
    for (const op of effect.operations) {
      if (op.op === 'addEvidence') requireValid(evidence.has(op.evidenceId), '효과/증거 불일치');
      if (op.op === 'addDeduction') requireValid(deductions.has(op.deductionId), '효과/추리 불일치');
      if (op.op === 'revealEvidenceSection') requireValid(sections.has(op.sectionId), '효과/증거 공개 불일치');
      if (op.op === 'revealNotebookEntry') requireValid(notes.has(op.entryId), '효과/수첩 공개 불일치');
    }
  }
  const acquiredBy = (kind: 'addEvidence' | 'addDeduction', id: string) => [...effects].some(effectId => GAME_INDEX.effects.get(effectId)!.operations.some(op =>
    kind === 'addEvidence' ? op.op === kind && op.evidenceId === id : op.op === kind && op.deductionId === id));
  for (const id of evidence) requireValid(acquiredBy('addEvidence', id), '획득 효과 없는 증거');
  for (const id of deductions) requireValid(acquiredBy('addDeduction', id), '획득 효과 없는 추리');
  for (const [blockId, variantId] of Object.entries(s.resolvedVariants)) {
    const block = GAME_INDEX.blocks.get(blockId);
    requireValid(block?.content.type === 'conditional' && block.content.variants.some(v => v.id === variantId), 'block/확정 variant 불일치');
    requireValid(reached.has(sceneForBlock.get(blockId)!.id), '미도달 결과 확정 분기');
  }
  if (s.blockId !== null) {
    const block = scene.blocks[s.blockCursor];
    requireValid(block?.id === s.blockId && s.blockDisplay === 'typing', 'block cursor 불일치');
    requireValid(s.displayStage === 'block' || s.displayStage === 'result', 'block 표시 단계 불일치');
    requireValid(!revealed.has(block.id), '완료 block 재표시');
    requireValid(s.resolvedVariantId === (s.resolvedVariants[block.id] ?? null), '현재 확정 분기 불일치');
    requireValid(scene.blocks.slice(s.blockCursor).every(b => !revealed.has(b.id)), '현재/미래 블록 선공개');
  } else {
    requireValid(s.resolvedVariantId === null, '커서 없는 확정 분기');
    if (s.displayStage === 'scene') {
      requireValid(s.blockCursor === 0 && s.blockDisplay === 'typing' && GAME_CONTENT.chapters.some(c => c.entrySceneId === s.sceneId), '입장 전 상태 불일치');
      requireValid(scene.blocks.every(b => !revealed.has(b.id) && !s.resolvedVariants[b.id]) && scene.entryEffectIds.every(id => !effects.has(id)), '입장 전 효과/공개 오염');
    } else {
      requireValid(s.blockCursor < scene.blocks.length && s.blockDisplay === 'complete', '완료 cursor 불일치');
      if (s.displayStage === 'choice') requireValid(scene.choices.length > 0, '선택 없는 장면');
      else requireValid(s.displayStage === 'complete' && (scene.endCommand === 'TITLE' || s.blockedNextSceneId === scene.nextSceneId), '종료 단계 불일치');
    }
  }
  if (s.displayStage !== 'scene') {
    for (const block of scene.blocks) if (block.content.type === 'conditional') requireValid(s.resolvedVariants[block.id], '미확정 조건부 결과');
  }
  if (s.blockedNextSceneId) requireValid(GAME_INDEX.scenes.has(s.blockedNextSceneId) && scene.nextSceneId === s.blockedNextSceneId && s.displayStage === 'complete', '예정 next 불일치');
  const historyScenes = new Set<string>();
  let previousRevision = -1;
  for (const entry of s.choiceHistory) {
    const actual = choices.get(entry.choiceId);
    requireValid(actual && actual.scene.id === entry.sceneId && actual.choice.resultSceneId === entry.resultSceneId, '선택 참조 불일치');
    requireValid(!historyScenes.has(entry.sceneId), '중복 선택');
    requireValid(Number.isSafeInteger(entry.revision) && entry.revision > previousRevision && entry.revision <= s.saveRevision, '선택 revision 불일치');
    historyScenes.add(entry.sceneId);
    previousRevision = entry.revision;
  }
  if (s.displayStage === 'choice') requireValid(!historyScenes.has(s.sceneId), '이미 확정한 선택 대기');
  if (s.displayStage === 'result') requireValid(s.choiceHistory.at(-1)?.resultSceneId === s.sceneId, '선택 없는 결과');
  const logIds = new Set<string>();
  const loggedBlocks = new Set<string>();
  previousRevision = -1;
  for (const log of s.displayLog) {
    requireValid(!logIds.has(log.id) && log.blockId && !loggedBlocks.has(log.blockId), '중복/빈 표시 로그');
    requireValid(sceneForBlock.get(log.blockId)?.id === log.sceneId && revealed.has(log.blockId), '표시 로그/공개 불일치');
    requireValid(reached.has(log.sceneId), '미도달 장면 표시 이력');
    requireValid((log.stage === 'block' || log.stage === 'result') && Number.isSafeInteger(log.revision) && log.revision > previousRevision && log.revision <= s.saveRevision, '표시 로그 revision 불일치');
    previousRevision = log.revision;
    logIds.add(log.id);
    loggedBlocks.add(log.blockId);
  }
  requireValid(loggedBlocks.size === revealed.size, '공개 이력 누락');
  for (const id of revealed) requireValid(GAME_INDEX.blocks.has(id), '알 수 없는 공개 block');
  const hasRevealOrigin = (kind: 'revealEvidenceSection' | 'revealNotebookEntry', id: string) => [...revealed].some(blockId =>
    GAME_INDEX.blocks.get(blockId)!.completionEffectIds.some(effectId => effects.has(effectId) && GAME_INDEX.effects.get(effectId)!.operations.some(op =>
      kind === 'revealEvidenceSection' ? op.op === kind && op.sectionId === id : op.op === kind && op.entryId === id)));
  for (const id of sections) {
    const section = GAME_INDEX.evidenceSections.get(id);
    requireValid(section && evidence.has(section.evidenceId) && hasRevealOrigin('revealEvidenceSection', id), '획득/완료 전 증거 공개');
  }
  for (const id of notes) requireValid(GAME_INDEX.notebookEntries.has(id) && hasRevealOrigin('revealNotebookEntry', id), '완료 전 진술 공개');
  if (s.displayStage === 'complete' && scene.endCommand === 'TITLE') requireValid(revealed.has(scene.blocks.at(-1)!.id), '종료 문장 미완료');
  for (const sceneId of reached) {
    const visited = GAME_INDEX.scenes.get(sceneId)!;
    if (!(s.displayStage === 'scene' && sceneId === s.sceneId)) {
      for (const id of visited.entryEffectIds) if (!GAME_INDEX.effects.get(id)!.condition) requireValid(effects.has(id), '입장 효과 누락');
    }
    for (const choice of visited.choices) if (s.choiceHistory.some(h => h.choiceId === choice.id)) {
      for (const id of choice.effectIds) if (!GAME_INDEX.effects.get(id)!.condition) requireValid(effects.has(id), '선택 효과 누락');
    }
    for (const block of visited.blocks) if (revealed.has(block.id)) {
      for (const id of block.completionEffectIds) if (!GAME_INDEX.effects.get(id)!.condition) requireValid(effects.has(id), '완료 효과 누락');
    }
  }
  return s;
}

export function validateEntry(chapterId: string, state: unknown): PersistedGameState {
  const chapter = GAME_CONTENT.chapters.find(c => c.id === chapterId);
  const s = validateSnapshot(state);
  requireValid(chapter && s.sceneId === chapter.entrySceneId && s.displayStage === 'scene', '챕터 입장 스냅샷 불일치');
  const order = chapterOrder.get(chapter.id)!;
  const before = (sceneId: string) => (chapterOrder.get(GAME_INDEX.scenes.get(sceneId)!.chapterId) ?? Infinity) < order;
  requireValid(s.choiceHistory.every(h => before(h.sceneId)) && s.displayLog.every(log => before(log.sceneId)), '이후 챕터 이력 혼입');
  requireValid(Object.keys(s.resolvedVariants).every(id => before(sceneForBlock.get(id)!.id)), '이후 챕터 확정 결과 혼입');
  requireValid(s.appliedEffects.every(id => effectChapters.get(id)?.some(value => value < order)), '입장 전/이후 효과 혼입');
  return s;
}

export function isCompletedEnding(state: PersistedGameState): boolean {
  return state.displayStage === 'complete' && GAME_INDEX.scenes.get(state.sceneId)?.endCommand === 'TITLE';
}
export function isPreAccusation(state: PersistedGameState): boolean {
  return state.displayStage === 'choice' && GAME_INDEX.scenes.get(state.sceneId)?.choices.some(c => c.id === 'C24_A') === true;
}
export function validateSaveDocument(input: unknown): SaveDocument {
  const doc = SaveDocumentSchema.parse(input);
  for (const [id, run] of Object.entries(doc.runs)) {
    requireValid(id === run.runId && id !== run.parentRunId, '실행 ID 불일치');
    const ancestors = new Set<string>([id]);
    let parent = run.parentRunId;
    while (parent && doc.runs[parent]) {
      requireValid(!ancestors.has(parent), '실행 부모 순환');
      ancestors.add(parent); parent = doc.runs[parent]!.parentRunId;
    }
    const baseline = run.completed ?? run.protected ?? Object.values(run.entries)[0];
    const sameRun = (s: PersistedGameState) => {
      requireValid(s.runId === id && s.parentRunId === run.parentRunId, '다른 실행 스냅샷 혼입');
      if (baseline) requireValid(s.seed === baseline.seed, '실행 seed 불일치');
    };
    for (const [chapterId, entry] of Object.entries(run.entries)) { validateEntry(chapterId, entry); sameRun(entry); }
    if (run.protected) { validateSnapshot(run.protected); sameRun(run.protected); requireValid(isPreAccusation(run.protected), '지목전 보호본 불일치'); }
    if (run.completed) {
      validateSnapshot(run.completed); sameRun(run.completed); requireValid(isCompletedEnding(run.completed), '엔딩 미완료 실행');
      for (const entry of Object.values(run.entries)) {
        requireValid(entry.saveRevision <= run.completed.saveRevision && entry.choiceHistory.every((choice, i) => JSON.stringify(choice) === JSON.stringify(run.completed!.choiceHistory[i])), '엔딩 원본 이전 이력 불일치');
      }
    }
  }
  for (const slot of [doc.auto, ...doc.manual]) {
    if (!slot) continue;
    validateSnapshot(slot.state);
    const run = doc.runs[slot.state.runId];
    requireValid(run && run.parentRunId === slot.state.parentRunId, '슬롯 실행 누락');
    const baseline = run.completed ?? run.protected ?? Object.values(run.entries)[0];
    if (baseline) requireValid(slot.state.seed === baseline.seed, '슬롯 seed 불일치');
    if (run.completed) requireValid(slot.state.choiceHistory.every((h, i) => JSON.stringify(h) === JSON.stringify(run.completed!.choiceHistory[i])), '원본과 다른 슬롯 이력');
  }
  return doc;
}
