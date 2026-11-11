import { describe, expect, it } from 'vitest';
import { EffectDefinitionSchema } from '../src/content/schema';
import { SOURCE_PATH, SOURCE_SHA256 } from '../src/content/source';
import { orderChoiceIds } from '../src/engine/selection-order';
import {
  createInitialState,
  deserializeGameState,
  getInsight,
  serializeGameState,
} from '../src/engine/state';
import { applyEffectDefinition } from '../src/engine/transition';

const source = {
  sourceHash: SOURCE_SHA256,
  sourcePath: SOURCE_PATH,
  lineStart: 1020,
  lineEnd: 1033,
  stableBlockId: 'SRC_C15_A',
} as const;

const c15AEffect = EffectDefinitionSchema.parse({
  id: 'FX_C15_A',
  operations: [
    { op: 'addEvidence', evidenceId: 'E07' },
    { op: 'adjustTrust', characterId: 'CHAR_JUNSEOK', delta: 1 },
  ],
  source,
});

function initial() {
  return createInitialState({
    runId: 'RUN_TEST',
    sceneId: 'CH07_S01',
    seed: 42,
    characterIds: ['CHAR_JUNSEOK', 'CHAR_SUHYEON'],
  });
}

describe('pure state transitions', () => {
  it('applies C15 relation gain even when evidence already exists, once per effect', () => {
    const withEvidence = applyEffectDefinition(initial(),
      EffectDefinitionSchema.parse({
        id: 'FX_E07_EARLIER',
        operations: [{ op: 'addEvidence', evidenceId: 'E07' }],
        source,
      }),
    );
    const afterC15 = applyEffectDefinition(withEvidence, c15AEffect);
    const replayed = applyEffectDefinition(afterC15, c15AEffect);

    expect([...afterC15.evidence]).toEqual(['E07']);
    expect(afterC15.relations.CHAR_JUNSEOK?.trust).toBe(1);
    expect(replayed).toBe(afterC15);
  });

  it('clamps trust to 2 and suspicion to 0..3', () => {
    const trustEffect = EffectDefinitionSchema.parse({
      id: 'FX_TRUST_CAP',
      operations: [
        { op: 'adjustTrust', characterId: 'CHAR_JUNSEOK', delta: 8 },
        { op: 'adjustSuspicion', characterId: 'CHAR_JUNSEOK', delta: 8 },
      ],
      source,
    });
    const result = applyEffectDefinition(initial(), trustEffect);
    expect(result.relations.CHAR_JUNSEOK).toEqual({ trust: 2, suspicion: 3 });
  });

  it('derives insight from deduction count and serializes sets as arrays', () => {
    const effect = EffectDefinitionSchema.parse({
      id: 'FX_D1',
      operations: [{ op: 'addDeduction', deductionId: 'D1' }],
      source,
    });
    const state = applyEffectDefinition(initial(), effect);
    const serialized = serializeGameState(state);
    const raw = JSON.parse(serialized) as { deductions: unknown; appliedEffects: unknown };
    const restored = deserializeGameState(serialized);

    expect(getInsight(state)).toBe(1);
    expect(raw.deductions).toEqual(['D1']);
    expect(raw.appliedEffects).toEqual(['FX_D1']);
    expect(restored.deductions).toBeInstanceOf(Set);
  });

  it('orders choices reproducibly by seed and scene without outcome randomness', () => {
    const choices = ['C15_A', 'C15_B', 'C15_C'];
    const first = orderChoiceIds(choices, 734, 'CH07_S01');
    expect(orderChoiceIds(choices, 734, 'CH07_S01')).toEqual(first);
    expect(first).toHaveLength(3);
    expect(new Set(first)).toEqual(new Set(choices));
  });
});
