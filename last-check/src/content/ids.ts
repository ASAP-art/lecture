import { z } from 'zod';

const idSchema = (label: string, pattern: RegExp) =>
  z.string().regex(pattern, `${label} 형식이 올바르지 않습니다.`);

export const ChapterIdSchema = idSchema('chapter ID', /^CH\d{2}$/);
export const SceneIdSchema = idSchema(
  'scene ID',
  /^(?:CH\d{2}_S\d{2}(?:_[A-C])?|END_(?:TRUE|GOOD|BAD\d{2}))$/,
);
export const ChoiceIdSchema = idSchema('choice ID', /^C\d{2}_[A-C]$/);
export const BlockIdSchema = idSchema('block ID', /^BLK_[A-Z0-9_]+$/);
export const EffectIdSchema = idSchema('effect ID', /^FX_[A-Z0-9_]+$/);
export const EvidenceIdSchema = idSchema('evidence ID', /^E\d{2}$/);
export const CharacterIdSchema = idSchema('character ID', /^CHAR_[A-Z0-9_]+$/);
export const DeductionIdSchema = idSchema('deduction ID', /^D\d+$/);
export const AssetIdSchema = idSchema('asset ID', /^ASSET_[A-Z0-9_]+$/);
export const FlagIdSchema = idSchema('flag ID', /^FLAG_[A-Z0-9_]+$/);
export const VariantIdSchema = idSchema('variant ID', /^VAR_[A-Z0-9_]+$/);
export const EvidenceSectionIdSchema = idSchema(
  'evidence section ID',
  /^ESECTION_[A-Z0-9_]+$/,
);
export const SourceBlockIdSchema = idSchema('source block ID', /^SRC_[A-Z0-9_]+$/);
export const NotebookEntryIdSchema = idSchema('notebook entry ID', /^NOTE_[A-Z0-9_]+$/);
export const RunIdSchema = idSchema('run ID', /^RUN_[A-Z0-9_-]+$/);
export const DisplayLogIdSchema = idSchema('display log ID', /^LOG_[A-Z0-9_-]+$/);

export type ChapterId = z.infer<typeof ChapterIdSchema>;
export type SceneId = z.infer<typeof SceneIdSchema>;
export type ChoiceId = z.infer<typeof ChoiceIdSchema>;
export type BlockId = z.infer<typeof BlockIdSchema>;
export type EffectId = z.infer<typeof EffectIdSchema>;
export type EvidenceId = z.infer<typeof EvidenceIdSchema>;
export type CharacterId = z.infer<typeof CharacterIdSchema>;
export type DeductionId = z.infer<typeof DeductionIdSchema>;
export type AssetId = z.infer<typeof AssetIdSchema>;
export type FlagId = z.infer<typeof FlagIdSchema>;
export type VariantId = z.infer<typeof VariantIdSchema>;
export type EvidenceSectionId = z.infer<typeof EvidenceSectionIdSchema>;
export type NotebookEntryId = z.infer<typeof NotebookEntryIdSchema>;
