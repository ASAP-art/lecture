import { describe, expect, it } from 'vitest';
import fixture from './fixtures/ch07-conditional.json';
import { BlockDefinitionSchema, EffectDefinitionSchema } from '../src/content/schema';
import { SOURCE_PATH, SOURCE_SHA256 } from '../src/content/source';
import { blockText, resolveBlockVariant } from '../src/engine/gameplay';
import { createInitialState } from '../src/engine/state';
import { applyEffectDefinition } from '../src/engine/transition';

const block = BlockDefinitionSchema.parse(fixture);
const addE07 = EffectDefinitionSchema.parse({
  id: 'FX_CH07_TEST_E07',
  operations: [{ op: 'addEvidence', evidenceId: 'E07' }],
  source: {
    sourceHash: SOURCE_SHA256,
    sourcePath: SOURCE_PATH,
    lineStart: 1078,
    lineEnd: 1096,
    stableBlockId: 'SRC_CH07_TEST_E07',
  },
});

function state() {
  return createInitialState({
    runId: 'RUN_CH07_CONDITION_TEST',
    sceneId: 'CH07_S02_A',
    seed: 7,
    characterIds: [],
  });
}

describe('actual CH07 conditional result fixture', () => {
  it('selects the E07-held source variant', () => {
    const held = applyEffectDefinition(state(), addE07);
    expect(resolveBlockVariant(block, held)).toBe('VAR_CH07_S02_A_HAS_E07');
  });

  it('selects the E07-missing source variant and keeps the pre-effect resolution', () => {
    const beforeEffect = state();
    const variantId = resolveBlockVariant(block, beforeEffect);
    expect(variantId).toBe('VAR_CH07_S02_A_MISSING_E07');

    const resolvedBeforeEffect = {
      ...beforeEffect,
      resolvedVariantId: variantId,
      resolvedVariants: { [block.id]: variantId! },
    };
    const afterEffect = applyEffectDefinition(resolvedBeforeEffect, addE07);

    expect(afterEffect.evidence.has('E07')).toBe(true);
    expect(blockText(block, afterEffect)).toBe(
      '도현: “그 순서를 확정하려면 독립 이력이 필요합니다. 지금은 후보 시간표예요.”\n\n서진: “현재 상태를 과거의 원인으로 바로 쓸 수 없다는 것까지만 적어.”',
    );
  });
});
