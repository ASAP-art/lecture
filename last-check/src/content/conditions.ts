import { z } from 'zod';
import {
  CharacterIdSchema,
  DeductionIdSchema,
  EvidenceIdSchema,
  FlagIdSchema,
  type CharacterId,
  type DeductionId,
  type EvidenceId,
  type FlagId,
} from './ids';

export const FlagValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export type FlagValue = z.infer<typeof FlagValueSchema>;

export type Condition =
  | { op: 'all'; conditions: Condition[] }
  | { op: 'any'; conditions: Condition[] }
  | { op: 'not'; condition: Condition }
  | { op: 'hasEvidence'; evidenceId: EvidenceId }
  | { op: 'hasDeduction'; deductionId: DeductionId }
  | { op: 'trustAtLeast'; characterId: CharacterId; value: number }
  | { op: 'flag'; flagId: FlagId; equals: FlagValue };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({ op: z.literal('all'), conditions: z.array(ConditionSchema) }).strict(),
    z.object({ op: z.literal('any'), conditions: z.array(ConditionSchema) }).strict(),
    z.object({ op: z.literal('not'), condition: ConditionSchema }).strict(),
    z.object({ op: z.literal('hasEvidence'), evidenceId: EvidenceIdSchema }).strict(),
    z.object({ op: z.literal('hasDeduction'), deductionId: DeductionIdSchema }).strict(),
    z
      .object({
        op: z.literal('trustAtLeast'),
        characterId: CharacterIdSchema,
        value: z.number().int().min(-2).max(2),
      })
      .strict(),
    z
      .object({
        op: z.literal('flag'),
        flagId: FlagIdSchema,
        equals: FlagValueSchema,
      })
      .strict(),
  ]),
);

export interface ConditionContext {
  evidence: ReadonlySet<EvidenceId>;
  deductions: ReadonlySet<DeductionId>;
  relations: Readonly<Record<CharacterId, { trust: number }>>;
  flags: Readonly<Record<FlagId, FlagValue>>;
}

function assertNever(value: never): never {
  throw new Error(`알 수 없는 조건 연산: ${JSON.stringify(value)}`);
}

export function evaluateCondition(
  condition: Condition,
  context: ConditionContext,
): boolean {
  switch (condition.op) {
    case 'all':
      return condition.conditions.every((child) => evaluateCondition(child, context));
    case 'any':
      return condition.conditions.some((child) => evaluateCondition(child, context));
    case 'not':
      return !evaluateCondition(condition.condition, context);
    case 'hasEvidence':
      return context.evidence.has(condition.evidenceId);
    case 'hasDeduction':
      return context.deductions.has(condition.deductionId);
    case 'trustAtLeast': {
      const relation = context.relations[condition.characterId];
      if (!relation) {
        throw new Error(`알 수 없는 인물 ID: ${condition.characterId}`);
      }
      return relation.trust >= condition.value;
    }
    case 'flag':
      if (!Object.prototype.hasOwnProperty.call(context.flags, condition.flagId)) {
        throw new Error(`알 수 없는 flag ID: ${condition.flagId}`);
      }
      return Object.is(context.flags[condition.flagId], condition.equals);
    default:
      return assertNever(condition);
  }
}
