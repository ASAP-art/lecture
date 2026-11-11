import { describe, expect, it } from 'vitest';
import { ConditionSchema } from '../src/content/conditions';
import {
  AssetIdSchema,
  BlockIdSchema,
  CharacterIdSchema,
  ChoiceIdSchema,
  DeductionIdSchema,
  EffectIdSchema,
  EvidenceIdSchema,
  SceneIdSchema,
} from '../src/content/ids';
import { parseGameContent } from '../src/content/schema';
import { SOURCE_PATH, SOURCE_SHA256 } from '../src/content/source';

const source = (stableBlockId: string) => ({
  sourceHash: SOURCE_SHA256,
  sourcePath: SOURCE_PATH,
  lineStart: 1,
  lineEnd: 1,
  stableBlockId,
});

function validContent() {
  return {
    schemaVersion: 1,
    sourceHash: SOURCE_SHA256,
    characters: [{ id: 'CHAR_TEST', name: '검사용', source: source('SRC_CHARACTER_TEST') }],
    evidence: [
      {
        id: 'E01',
        title: '검사용 증거',
        sectionIds: ['ESECTION_TEST'],
        source: source('SRC_EVIDENCE_TEST'),
      },
    ],
    evidenceSections: [
      {
        id: 'ESECTION_TEST',
        evidenceId: 'E01',
        title: '검사용 섹션',
        body: '검사용 본문',
        source: source('SRC_EVIDENCE_SECTION_TEST'),
      },
    ],
    notebookEntries: [
      {
        id: 'NOTE_TEST',
        title: '검사용 수첩 기록',
        body: '검사용 수첩 본문',
        source: source('SRC_NOTE_TEST'),
      },
    ],
    deductions: [{ id: 'D1', title: '검사용 추리', source: source('SRC_DEDUCTION_TEST') }],
    assets: [
      {
        id: 'ASSET_TEST',
        kind: 'document',
        publicPath: '/assets/test.png',
        alt: '',
        source: source('SRC_ASSET_TEST'),
      },
    ],
    flags: [{ id: 'FLAG_TEST', source: source('SRC_FLAG_TEST') }],
    effects: [
      {
        id: 'FX_TEST',
        operations: [
          { op: 'addEvidence', evidenceId: 'E01' },
          { op: 'addDeduction', deductionId: 'D1' },
          { op: 'adjustTrust', characterId: 'CHAR_TEST', delta: 1 },
          { op: 'adjustSuspicion', characterId: 'CHAR_TEST', delta: 1 },
          { op: 'setFlag', flagId: 'FLAG_TEST', value: true },
          { op: 'revealBlock', blockId: 'BLK_RESULT' },
          { op: 'revealEvidenceSection', sectionId: 'ESECTION_TEST' },
          { op: 'revealNotebookEntry', entryId: 'NOTE_TEST' },
          { op: 'resolveVariant', variantId: 'VAR_TEST' },
        ],
        source: source('SRC_EFFECT_TEST'),
      },
    ],
    chapters: [
      {
        id: 'CH01',
        title: '검사용 챕터',
        entrySceneId: 'CH01_S01',
        source: source('SRC_CHAPTER_TEST'),
        scenes: [
          {
            id: 'CH01_S01',
            chapterId: 'CH01',
            title: '검사용 장면',
            source: source('SRC_SCENE_TEST'),
            entryCondition: {
              op: 'all',
              conditions: [
                { op: 'hasEvidence', evidenceId: 'E01' },
                { op: 'hasDeduction', deductionId: 'D1' },
                { op: 'trustAtLeast', characterId: 'CHAR_TEST', value: 0 },
                { op: 'flag', flagId: 'FLAG_TEST', equals: true },
                { op: 'not', condition: { op: 'any', conditions: [] } },
              ],
            },
            entryEffectIds: [],
            blocks: [
              {
                id: 'BLK_TEST',
                kind: 'document',
                content: {
                  type: 'conditional',
                  variants: [
                    {
                      id: 'VAR_TEST',
                      when: { op: 'flag', flagId: 'FLAG_TEST', equals: true },
                      text: 'test-only',
                      source: source('SRC_VARIANT_TEST'),
                    },
                  ],
                },
                assetId: 'ASSET_TEST',
                completionEffectIds: [],
                source: source('SRC_BLOCK_TEST'),
              },
            ],
            choices: [
              {
                id: 'C01_A',
                label: 'test-only',
                resultSceneId: 'CH01_S01_A',
                effectIds: ['FX_TEST'],
                source: source('SRC_CHOICE_TEST'),
              },
            ],
          },
          {
            id: 'CH01_S01_A',
            chapterId: 'CH01',
            title: '',
            source: source('SRC_RESULT_TEST'),
            entryEffectIds: [],
            blocks: [
              {
                id: 'BLK_RESULT',
                kind: 'narration',
                content: { type: 'fixed', text: 'test-only' },
                completionEffectIds: [],
                source: source('SRC_RESULT_BLOCK_TEST'),
              },
            ],
            choices: [],
          },
        ],
      },
    ],
    unimplementedSceneIds: [],
  };
}

describe('content IDs and references', () => {
  it.each([
    [SceneIdSchema, 'CH01_S01', 'scene'],
    [ChoiceIdSchema, 'C01_A', 'choice'],
    [BlockIdSchema, 'BLK_TEST', 'block'],
    [EffectIdSchema, 'FX_TEST', 'effect'],
    [EvidenceIdSchema, 'E01', 'evidence'],
    [CharacterIdSchema, 'CHAR_TEST', 'character'],
    [DeductionIdSchema, 'D1', 'deduction'],
    [AssetIdSchema, 'ASSET_TEST', 'asset'],
  ])('%s accepts valid %s ID', (schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
    expect(schema.safeParse('invalid id').success).toBe(false);
  });

  it('accepts the supported declarative condition tree', () => {
    expect(() => parseGameContent(validContent())).not.toThrow();
  });

  it('rejects unknown condition operators without eval', () => {
    expect(ConditionSchema.safeParse({ op: 'suspicionAtLeast', value: 1 }).success).toBe(false);
    expect(ConditionSchema.safeParse({ op: 'runCode', code: 'true' }).success).toBe(false);
  });

  it('rejects unknown referenced IDs', () => {
    const content = validContent();
    content.effects[0]!.operations[0] = { op: 'addEvidence', evidenceId: 'E99' };
    expect(() => parseGameContent(content)).toThrow('알 수 없는 evidence ID: E99');
  });

  it('rejects unknown object fields and operations', () => {
    const content = validContent();
    content.effects[0]!.operations[0] = { op: 'unknown' } as never;
    expect(() => parseGameContent(content)).toThrow();
  });
});
