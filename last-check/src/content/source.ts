import { z } from 'zod';
import { SourceBlockIdSchema } from './ids';

export const SOURCE_SHA256 =
  '66e7358249200fd6624e03f7f818a9c1a0f434cb3ca032c3ef1c89b148fa7336' as const;
export const SOURCE_PATH = 'source/마지막_확인_전체_시나리오.md' as const;

export const SourceRefSchema = z
  .object({
    sourceHash: z.literal(SOURCE_SHA256),
    sourcePath: z.literal(SOURCE_PATH),
    lineStart: z.number().int().positive(),
    lineEnd: z.number().int().positive(),
    stableBlockId: SourceBlockIdSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.lineEnd < value.lineStart) {
      context.addIssue({
        code: 'custom',
        message: 'source lineEnd는 lineStart보다 작을 수 없습니다.',
        path: ['lineEnd'],
      });
    }
  });

export type SourceRef = z.infer<typeof SourceRefSchema>;
