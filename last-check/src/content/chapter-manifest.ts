import { z } from 'zod';
import { ChapterIdSchema } from './ids';
import { SOURCE_PATH, SOURCE_SHA256, SourceRefSchema } from './source';

const ChapterImportEntrySchema = z
  .object({
    id: ChapterIdSchema,
    title: z.string().min(1),
    status: z.enum(['pending', 'imported']),
    file: z.string().regex(/^chapter-\d{2}\.json$/).optional(),
    commonSceneCount: z.number().int().nonnegative(),
    resultSceneCount: z.number().int().nonnegative(),
    source: SourceRefSchema,
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.status === 'imported' && !entry.file) {
      context.addIssue({
        code: 'custom',
        message: 'imported 챕터에는 file이 필요합니다.',
        path: ['file'],
      });
    }
    if (entry.status === 'pending' && entry.file) {
      context.addIssue({
        code: 'custom',
        message: 'pending 챕터에는 file을 지정하지 않습니다.',
        path: ['file'],
      });
    }
  });

export const ChapterImportManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z
      .object({
        path: z.literal(SOURCE_PATH),
        sha256: z.literal(SOURCE_SHA256),
      })
      .strict(),
    expected: z
      .object({
        chapters: z.literal(10),
        commonScenes: z.literal(24),
        resultScenes: z.literal(54),
        endings: z.literal(4),
        totalScenes: z.literal(82),
        choices: z.literal(54),
        evidence: z.literal(15),
        deductions: z.literal(6),
      })
      .strict(),
    chapters: z.array(ChapterImportEntrySchema).length(10),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = new Set<string>();
    let commonScenes = 0;
    let resultScenes = 0;
    for (const chapter of manifest.chapters) {
      if (ids.has(chapter.id)) {
        context.addIssue({ code: 'custom', message: `중복 chapter ID: ${chapter.id}` });
      }
      ids.add(chapter.id);
      commonScenes += chapter.commonSceneCount;
      resultScenes += chapter.resultSceneCount;
    }
    if (commonScenes !== manifest.expected.commonScenes) {
      context.addIssue({ code: 'custom', message: '공통 장면 계수가 매니페스트와 다릅니다.' });
    }
    if (resultScenes !== manifest.expected.resultScenes) {
      context.addIssue({ code: 'custom', message: '결과 장면 계수가 매니페스트와 다릅니다.' });
    }
  });

export type ChapterImportManifest = z.infer<typeof ChapterImportManifestSchema>;
