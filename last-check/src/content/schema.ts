import { z } from 'zod';
import { ConditionSchema, type Condition } from './conditions';
import {
  AssetIdSchema,
  BlockIdSchema,
  ChapterIdSchema,
  CharacterIdSchema,
  ChoiceIdSchema,
  DeductionIdSchema,
  EffectIdSchema,
  EvidenceIdSchema,
  EvidenceSectionIdSchema,
  FlagIdSchema,
  NotebookEntryIdSchema,
  SceneIdSchema,
  VariantIdSchema,
} from './ids';
import { SOURCE_SHA256, SourceRefSchema } from './source';

const sourceTracked = { source: SourceRefSchema } as const;

export const CharacterDefinitionSchema = z
  .object({
    id: CharacterIdSchema,
    name: z.string().min(1),
    ...sourceTracked,
  })
  .strict();

export const EvidenceDefinitionSchema = z
  .object({
    id: EvidenceIdSchema,
    title: z.string().min(1),
    sectionIds: z.array(EvidenceSectionIdSchema),
    ...sourceTracked,
  })
  .strict();

export const EvidenceSectionDefinitionSchema = z
  .object({
    id: EvidenceSectionIdSchema,
    evidenceId: EvidenceIdSchema,
    title: z.string().min(1),
    body: z.string().min(1),
    ...sourceTracked,
  })
  .strict();

export const NotebookEntryDefinitionSchema = z
  .object({
    id: NotebookEntryIdSchema,
    title: z.string().min(1),
    body: z.string().min(1),
    ...sourceTracked,
  })
  .strict();

export const DeductionDefinitionSchema = z
  .object({
    id: DeductionIdSchema,
    title: z.string().min(1),
    ...sourceTracked,
  })
  .strict();

export const AssetDefinitionSchema = z
  .object({
    id: AssetIdSchema,
    kind: z.enum(['portrait', 'background', 'document', 'icon', 'audio']),
    publicPath: z.string().regex(/^\/assets\/[A-Za-z0-9_./-]+$/),
    alt: z.string(),
    ...sourceTracked,
  })
  .strict();

export const FlagDefinitionSchema = z
  .object({
    id: FlagIdSchema,
    ...sourceTracked,
  })
  .strict();

export const EffectOperationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('addEvidence'), evidenceId: EvidenceIdSchema }).strict(),
  z.object({ op: z.literal('addDeduction'), deductionId: DeductionIdSchema }).strict(),
  z
    .object({
      op: z.literal('adjustTrust'),
      characterId: CharacterIdSchema,
      delta: z.number().int(),
    })
    .strict(),
  z
    .object({
      op: z.literal('adjustSuspicion'),
      characterId: CharacterIdSchema,
      delta: z.number().int(),
    })
    .strict(),
  z
    .object({
      op: z.literal('setFlag'),
      flagId: FlagIdSchema,
      value: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
    })
    .strict(),
  z.object({ op: z.literal('revealBlock'), blockId: BlockIdSchema }).strict(),
  z
    .object({ op: z.literal('revealEvidenceSection'), sectionId: EvidenceSectionIdSchema })
    .strict(),
  z.object({ op: z.literal('revealNotebookEntry'), entryId: NotebookEntryIdSchema }).strict(),
  z.object({ op: z.literal('resolveVariant'), variantId: VariantIdSchema }).strict(),
]);

export const EffectDefinitionSchema = z
  .object({
    id: EffectIdSchema,
    operations: z.array(EffectOperationSchema).min(1),
    condition: ConditionSchema.optional(),
    ...sourceTracked,
  })
  .strict();

export const BlockVariantSchema = z
  .object({
    id: VariantIdSchema,
    when: ConditionSchema,
    text: z.string().min(1),
    ...sourceTracked,
  })
  .strict();

const BlockContentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fixed'), text: z.string().min(1) }).strict(),
  z
    .object({
      type: z.literal('conditional'),
      variants: z.array(BlockVariantSchema).min(1),
    })
    .strict(),
]);

export const BlockDefinitionSchema = z
  .object({
    id: BlockIdSchema,
    kind: z.enum([
      'narration',
      'dialogue',
      'document',
      'choicePrompt',
      'endingCard',
      'closingLine',
    ]),
    content: BlockContentSchema,
    speakerId: CharacterIdSchema.optional(),
    assetId: AssetIdSchema.optional(),
    condition: ConditionSchema.optional(),
    pinned: z.boolean().optional(),
    confirmationCondition: ConditionSchema.optional(),
    completionEffectIds: z.array(EffectIdSchema),
    ...sourceTracked,
  })
  .strict();

export const ChoiceDefinitionSchema = z
  .object({
    id: ChoiceIdSchema,
    label: z.string().min(1),
    resultSceneId: SceneIdSchema,
    effectIds: z.array(EffectIdSchema),
    condition: ConditionSchema.optional(),
    disabledReason: z.string().min(1).optional(),
    ...sourceTracked,
  })
  .strict();

export const SceneDefinitionSchema = z
  .object({
    id: SceneIdSchema,
    chapterId: ChapterIdSchema,
    title: z.string(),
    blocks: z.array(BlockDefinitionSchema).min(1),
    choices: z.array(ChoiceDefinitionSchema),
    entryCondition: ConditionSchema.optional(),
    entryEffectIds: z.array(EffectIdSchema),
    presentationInstructions: z.array(
      z.object({ text: z.string().min(1), ...sourceTracked }).strict(),
    ).optional(),
    nextSceneId: SceneIdSchema.optional(),
    nextVariants: z.array(z.object({
      when: ConditionSchema,
      sceneId: SceneIdSchema,
      ...sourceTracked,
    }).strict()).min(1).optional(),
    endCommand: z.literal('TITLE').optional(),
    ...sourceTracked,
  })
  .strict();

export const ChapterDefinitionSchema = z
  .object({
    id: ChapterIdSchema,
    title: z.string().min(1),
    entrySceneId: SceneIdSchema,
    scenes: z.array(SceneDefinitionSchema).min(1),
    ...sourceTracked,
  })
  .strict();

export const GameContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceHash: z.literal(SOURCE_SHA256),
    characters: z.array(CharacterDefinitionSchema),
    evidence: z.array(EvidenceDefinitionSchema),
    evidenceSections: z.array(EvidenceSectionDefinitionSchema),
    notebookEntries: z.array(NotebookEntryDefinitionSchema),
    deductions: z.array(DeductionDefinitionSchema),
    assets: z.array(AssetDefinitionSchema),
    flags: z.array(FlagDefinitionSchema),
    effects: z.array(EffectDefinitionSchema),
    chapters: z.array(ChapterDefinitionSchema),
    unimplementedSceneIds: z.array(SceneIdSchema),
  })
  .strict();

export type EffectOperation = z.infer<typeof EffectOperationSchema>;
export type EffectDefinition = z.infer<typeof EffectDefinitionSchema>;
export type BlockDefinition = z.infer<typeof BlockDefinitionSchema>;
export type ChoiceDefinition = z.infer<typeof ChoiceDefinitionSchema>;
export type SceneDefinition = z.infer<typeof SceneDefinitionSchema>;
export type ChapterDefinition = z.infer<typeof ChapterDefinitionSchema>;
export type EvidenceDefinition = z.infer<typeof EvidenceDefinitionSchema>;
export type EvidenceSectionDefinition = z.infer<typeof EvidenceSectionDefinitionSchema>;
export type NotebookEntryDefinition = z.infer<typeof NotebookEntryDefinitionSchema>;
export type GameContent = z.infer<typeof GameContentSchema>;

function uniqueMap<T extends { id: string }>(items: readonly T[], label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    if (result.has(item.id)) {
      throw new Error(`중복 ${label} ID: ${item.id}`);
    }
    result.set(item.id, item);
  }
  return result;
}

function validateConditionReferences(
  condition: Condition,
  references: {
    evidence: ReadonlySet<string>;
    deductions: ReadonlySet<string>;
    characters: ReadonlySet<string>;
    flags: ReadonlySet<string>;
  },
): void {
  switch (condition.op) {
    case 'all':
    case 'any':
      condition.conditions.forEach((child) => validateConditionReferences(child, references));
      return;
    case 'not':
      validateConditionReferences(condition.condition, references);
      return;
    case 'hasEvidence':
      if (!references.evidence.has(condition.evidenceId)) {
        throw new Error(`알 수 없는 evidence ID: ${condition.evidenceId}`);
      }
      return;
    case 'hasDeduction':
      if (!references.deductions.has(condition.deductionId)) {
        throw new Error(`알 수 없는 deduction ID: ${condition.deductionId}`);
      }
      return;
    case 'trustAtLeast':
      if (!references.characters.has(condition.characterId)) {
        throw new Error(`알 수 없는 character ID: ${condition.characterId}`);
      }
      return;
    case 'flag':
      if (!references.flags.has(condition.flagId)) {
        throw new Error(`알 수 없는 flag ID: ${condition.flagId}`);
      }
  }
}

export function parseGameContent(input: unknown): GameContent {
  const content = GameContentSchema.parse(input);
  const characters = uniqueMap(content.characters, 'character');
  const evidence = uniqueMap(content.evidence, 'evidence');
  const evidenceSections = uniqueMap(content.evidenceSections, 'evidence section');
  const notebookEntries = uniqueMap(content.notebookEntries, 'notebook entry');
  const deductions = uniqueMap(content.deductions, 'deduction');
  const assets = uniqueMap(content.assets, 'asset');
  const flags = uniqueMap(content.flags, 'flag');
  const effects = uniqueMap(content.effects, 'effect');
  uniqueMap(content.chapters, 'chapter');

  const scenes = uniqueMap(content.chapters.flatMap((chapter) => chapter.scenes), 'scene');
  const unimplementedScenes = new Set(content.unimplementedSceneIds);
  if (unimplementedScenes.size !== content.unimplementedSceneIds.length) {
    throw new Error('중복 unimplemented scene ID가 있습니다.');
  }
  for (const sceneId of unimplementedScenes) {
    if (scenes.has(sceneId)) {
      throw new Error(`구현 및 미구현 scene ID가 중복됩니다: ${sceneId}`);
    }
  }
  const blocks = uniqueMap(
    content.chapters.flatMap((chapter) => chapter.scenes.flatMap((scene) => scene.blocks)),
    'block',
  );
  const variants = uniqueMap(
    content.chapters.flatMap((chapter) =>
      chapter.scenes.flatMap((scene) =>
        scene.blocks.flatMap((block) =>
          block.content.type === 'conditional' ? block.content.variants : [],
        ),
      ),
    ),
    'variant',
  );
  const choices = uniqueMap(
    content.chapters.flatMap((chapter) => chapter.scenes.flatMap((scene) => scene.choices)),
    'choice',
  );
  void choices;

  const references = {
    evidence: new Set(evidence.keys()),
    deductions: new Set(deductions.keys()),
    characters: new Set(characters.keys()),
    flags: new Set(flags.keys()),
  };

  for (const section of evidenceSections.values()) {
    if (!evidence.has(section.evidenceId)) {
      throw new Error(`알 수 없는 evidence ID: ${section.evidenceId}`);
    }
  }
  for (const item of evidence.values()) {
    for (const sectionId of item.sectionIds) {
      if (!evidenceSections.has(sectionId)) {
        throw new Error(`알 수 없는 evidence section ID: ${sectionId}`);
      }
    }
  }

  for (const effect of effects.values()) {
    if (effect.condition) validateConditionReferences(effect.condition, references);
    for (const operation of effect.operations) {
      switch (operation.op) {
        case 'addEvidence':
          if (!evidence.has(operation.evidenceId)) throw new Error(`알 수 없는 evidence ID: ${operation.evidenceId}`);
          break;
        case 'addDeduction':
          if (!deductions.has(operation.deductionId)) throw new Error(`알 수 없는 deduction ID: ${operation.deductionId}`);
          break;
        case 'adjustTrust':
        case 'adjustSuspicion':
          if (!characters.has(operation.characterId)) throw new Error(`알 수 없는 character ID: ${operation.characterId}`);
          break;
        case 'setFlag':
          if (!flags.has(operation.flagId)) throw new Error(`알 수 없는 flag ID: ${operation.flagId}`);
          break;
        case 'revealBlock':
          if (!blocks.has(operation.blockId)) throw new Error(`알 수 없는 block ID: ${operation.blockId}`);
          break;
        case 'revealEvidenceSection':
          if (!evidenceSections.has(operation.sectionId)) throw new Error(`알 수 없는 evidence section ID: ${operation.sectionId}`);
          break;
        case 'revealNotebookEntry':
          if (!notebookEntries.has(operation.entryId)) throw new Error(`알 수 없는 notebook entry ID: ${operation.entryId}`);
          break;
        case 'resolveVariant':
          if (!variants.has(operation.variantId)) throw new Error(`알 수 없는 variant ID: ${operation.variantId}`);
          break;
      }
    }
  }

  for (const chapter of content.chapters) {
    if (!scenes.has(chapter.entrySceneId)) {
      throw new Error(`알 수 없는 entry scene ID: ${chapter.entrySceneId}`);
    }
    for (const scene of chapter.scenes) {
      if (scene.chapterId !== chapter.id) {
        throw new Error(`scene ${scene.id}의 chapterId가 ${chapter.id}와 일치하지 않습니다.`);
      }
      if (scene.entryCondition) validateConditionReferences(scene.entryCondition, references);
      if ([!!scene.nextSceneId, !!scene.nextVariants, !!scene.endCommand].filter(Boolean).length > 1) {
        throw new Error(`scene 종료 경로가 중복됩니다: ${scene.id}`);
      }
      for (const route of scene.nextVariants ?? []) {
        validateConditionReferences(route.when, references);
        if (!scenes.has(route.sceneId) && !unimplementedScenes.has(route.sceneId)) {
          throw new Error(`알 수 없는 next scene ID: ${route.sceneId}`);
        }
      }
      if (
        scene.nextSceneId &&
        !scenes.has(scene.nextSceneId) &&
        !unimplementedScenes.has(scene.nextSceneId)
      ) {
        throw new Error(`알 수 없는 next scene ID: ${scene.nextSceneId}`);
      }
      scene.entryEffectIds.forEach((effectId) => {
        if (!effects.has(effectId)) throw new Error(`알 수 없는 effect ID: ${effectId}`);
      });
      for (const block of scene.blocks) {
        if (block.speakerId && !characters.has(block.speakerId)) throw new Error(`알 수 없는 speaker ID: ${block.speakerId}`);
        if (block.assetId && !assets.has(block.assetId)) throw new Error(`알 수 없는 asset ID: ${block.assetId}`);
        if (block.condition) validateConditionReferences(block.condition, references);
        if (block.confirmationCondition) validateConditionReferences(block.confirmationCondition, references);
        block.completionEffectIds.forEach((effectId) => {
          if (!effects.has(effectId)) throw new Error(`알 수 없는 effect ID: ${effectId}`);
        });
        if (block.content.type === 'conditional') {
          block.content.variants.forEach((variant) => validateConditionReferences(variant.when, references));
        }
      }
      for (const choice of scene.choices) {
        if (!scenes.has(choice.resultSceneId)) throw new Error(`알 수 없는 result scene ID: ${choice.resultSceneId}`);
        choice.effectIds.forEach((effectId) => {
          if (!effects.has(effectId)) throw new Error(`알 수 없는 effect ID: ${effectId}`);
        });
        if (choice.condition) validateConditionReferences(choice.condition, references);
      }
    }
  }

  return content;
}
