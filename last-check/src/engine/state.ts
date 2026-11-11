import { z } from 'zod';
import { FlagValueSchema, type FlagValue } from '../content/conditions';
import {
  BlockIdSchema,
  CharacterIdSchema,
  ChoiceIdSchema,
  DeductionIdSchema,
  DisplayLogIdSchema,
  EffectIdSchema,
  EvidenceIdSchema,
  EvidenceSectionIdSchema,
  NotebookEntryIdSchema,
  FlagIdSchema,
  RunIdSchema,
  SceneIdSchema,
  VariantIdSchema,
  type BlockId,
  type CharacterId,
  type ChoiceId,
  type DeductionId,
  type EffectId,
  type EvidenceId,
  type EvidenceSectionId,
  type NotebookEntryId,
  type FlagId,
  type SceneId,
  type VariantId,
} from '../content/ids';

export const STATE_VERSION = 3 as const;

export const RelationStateSchema = z
  .object({
    trust: z.number().int().min(-2).max(2),
    suspicion: z.number().int().min(0).max(3),
  })
  .strict();
export type RelationState = z.infer<typeof RelationStateSchema>;

export const DisplayStageSchema = z.enum([
  'scene',
  'block',
  'choice',
  'result',
  'ending',
  'complete',
]);
export type DisplayStage = z.infer<typeof DisplayStageSchema>;
export const BlockDisplaySchema = z.enum(['typing', 'complete']);
export type BlockDisplay = z.infer<typeof BlockDisplaySchema>;


export const ChoiceHistoryEntrySchema = z
  .object({
    choiceId: ChoiceIdSchema,
    sceneId: SceneIdSchema,
    resultSceneId: SceneIdSchema,
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type ChoiceHistoryEntry = z.infer<typeof ChoiceHistoryEntrySchema>;

export const DisplayLogEntrySchema = z
  .object({
    id: DisplayLogIdSchema,
    sceneId: SceneIdSchema,
    blockId: BlockIdSchema.nullable(),
    stage: DisplayStageSchema,
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type DisplayLogEntry = z.infer<typeof DisplayLogEntrySchema>;

function addDuplicateIssue(
  values: readonly string[],
  path: string,
  context: z.RefinementCtx,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', message: `${path}에 중복 ID가 있습니다.`, path: [path] });
  }
}

export const PersistedGameStateSchema = z
  .object({
    version: z.literal(STATE_VERSION),
    runId: RunIdSchema,
    parentRunId: RunIdSchema.nullable(),
    sceneId: SceneIdSchema,
    blockId: BlockIdSchema.nullable(),
    displayStage: DisplayStageSchema,
    resolvedVariantId: VariantIdSchema.nullable(),
    blockCursor: z.number().int().nonnegative(),
    blockDisplay: BlockDisplaySchema,
    resolvedVariants: z.record(BlockIdSchema, VariantIdSchema),
    blockedNextSceneId: SceneIdSchema.nullable(),
    choiceHistory: z.array(ChoiceHistoryEntrySchema),
    evidence: z.array(EvidenceIdSchema),
    deductions: z.array(DeductionIdSchema),
    relations: z.record(CharacterIdSchema, RelationStateSchema),
    flags: z.record(FlagIdSchema, FlagValueSchema),
    appliedEffects: z.array(EffectIdSchema),
    revealedBlocks: z.array(BlockIdSchema),
    revealedNotebookEntries: z.array(NotebookEntryIdSchema),
    revealedEvidenceSections: z.array(EvidenceSectionIdSchema),
    displayLog: z.array(DisplayLogEntrySchema),
    seed: z.number().int().min(0).max(0xffffffff),
    saveRevision: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((state, context) => {
    addDuplicateIssue(state.evidence, 'evidence', context);
    addDuplicateIssue(state.deductions, 'deductions', context);
    addDuplicateIssue(state.appliedEffects, 'appliedEffects', context);
    addDuplicateIssue(state.revealedBlocks, 'revealedBlocks', context);
    addDuplicateIssue(state.revealedNotebookEntries, 'revealedNotebookEntries', context);
    addDuplicateIssue(state.revealedEvidenceSections, 'revealedEvidenceSections', context);
  });

export type PersistedGameState = z.infer<typeof PersistedGameStateSchema>;

export interface RuntimeGameState {
  readonly version: typeof STATE_VERSION;
  readonly runId: string;
  readonly parentRunId: string | null;
  readonly sceneId: SceneId;
  readonly blockId: BlockId | null;
  readonly displayStage: DisplayStage;
  readonly resolvedVariantId: VariantId | null;
  readonly blockCursor: number;
  readonly blockDisplay: BlockDisplay;
  readonly resolvedVariants: Readonly<Record<BlockId, VariantId>>;
  readonly blockedNextSceneId: SceneId | null;
  readonly choiceHistory: readonly ChoiceHistoryEntry[];
  readonly evidence: ReadonlySet<EvidenceId>;
  readonly deductions: ReadonlySet<DeductionId>;
  readonly relations: Readonly<Record<CharacterId, RelationState>>;
  readonly revealedNotebookEntries: ReadonlySet<NotebookEntryId>;
  readonly flags: Readonly<Record<FlagId, FlagValue>>;
  readonly appliedEffects: ReadonlySet<EffectId>;
  readonly revealedBlocks: ReadonlySet<BlockId>;
  readonly revealedEvidenceSections: ReadonlySet<EvidenceSectionId>;
  readonly displayLog: readonly DisplayLogEntry[];
  readonly seed: number;
  readonly saveRevision: number;
}

export function createInitialState(input: {
  runId: string;
  parentRunId?: string | null;
  sceneId: SceneId;
  seed: number;
  characterIds: readonly CharacterId[];
  flags?: Readonly<Record<FlagId, FlagValue>>;
}): RuntimeGameState {
  const relations = Object.fromEntries(
    input.characterIds.map((characterId) => [characterId, { trust: 0, suspicion: 0 }]),
  ) as Record<CharacterId, RelationState>;

  return fromPersistedGameState({
    version: STATE_VERSION,
    runId: input.runId,
    parentRunId: input.parentRunId ?? null,
    sceneId: input.sceneId,
    blockId: null,
    displayStage: 'scene',
    resolvedVariantId: null,
    blockCursor: 0,
    blockDisplay: 'typing',
    resolvedVariants: {},
    blockedNextSceneId: null,
    choiceHistory: [],
    evidence: [],
    deductions: [],
    revealedNotebookEntries: [],
    relations,
    flags: { ...(input.flags ?? {}) },
    appliedEffects: [],
    revealedBlocks: [],
    revealedEvidenceSections: [],
    displayLog: [],
    seed: input.seed,
    saveRevision: 0,
  });
}

export function getInsight(state: RuntimeGameState): number {
  return state.deductions.size;
}

export function toPersistedGameState(state: RuntimeGameState): PersistedGameState {
  return PersistedGameStateSchema.parse({
    ...state,
    choiceHistory: [...state.choiceHistory],
    evidence: [...state.evidence].sort(),
    deductions: [...state.deductions].sort(),
    relations: { ...state.relations },
    flags: { ...state.flags },
    appliedEffects: [...state.appliedEffects].sort(),
    revealedBlocks: [...state.revealedBlocks].sort(),
    revealedEvidenceSections: [...state.revealedEvidenceSections].sort(),
    revealedNotebookEntries: [...state.revealedNotebookEntries].sort(),
    resolvedVariants: { ...state.resolvedVariants },
    displayLog: [...state.displayLog],
  });
}

export function fromPersistedGameState(input: unknown): RuntimeGameState {
  const state = PersistedGameStateSchema.parse(input);
  return {
    ...state,
    choiceHistory: [...state.choiceHistory],
    evidence: new Set(state.evidence),
    deductions: new Set(state.deductions),
    relations: { ...state.relations },
    flags: { ...state.flags },
    appliedEffects: new Set(state.appliedEffects),
    revealedBlocks: new Set(state.revealedBlocks),
    revealedEvidenceSections: new Set(state.revealedEvidenceSections),
    revealedNotebookEntries: new Set(state.revealedNotebookEntries),
    resolvedVariants: { ...state.resolvedVariants },
    displayLog: [...state.displayLog],
  };
}

export function serializeGameState(state: RuntimeGameState): string {
  return JSON.stringify(toPersistedGameState(state));
}

export function deserializeGameState(serialized: string): RuntimeGameState {
  return fromPersistedGameState(JSON.parse(serialized) as unknown);
}
