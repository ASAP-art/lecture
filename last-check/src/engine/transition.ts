import { evaluateCondition } from '../content/conditions';
import type { EffectDefinition, EffectOperation } from '../content/schema';
import type { CharacterId } from '../content/ids';
import type { RuntimeGameState } from './state';

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function relationFor(state: RuntimeGameState, characterId: CharacterId) {
  const relation = state.relations[characterId];
  if (!relation) {
    throw new Error(`알 수 없는 character ID: ${characterId}`);
  }
  return relation;
}

function applyOperation(
  state: RuntimeGameState,
  operation: EffectOperation,
): RuntimeGameState {
  switch (operation.op) {
    case 'addEvidence': {
      const evidence = new Set(state.evidence);
      evidence.add(operation.evidenceId);
      return { ...state, evidence };
    }
    case 'addDeduction': {
      const deductions = new Set(state.deductions);
      deductions.add(operation.deductionId);
      return { ...state, deductions };
    }
    case 'adjustTrust': {
      const relation = relationFor(state, operation.characterId);
      return {
        ...state,
        relations: {
          ...state.relations,
          [operation.characterId]: {
            ...relation,
            trust: clamp(relation.trust + operation.delta, -2, 2),
          },
        },
      };
    }
    case 'adjustSuspicion': {
      const relation = relationFor(state, operation.characterId);
      return {
        ...state,
        relations: {
          ...state.relations,
          [operation.characterId]: {
            ...relation,
            suspicion: clamp(relation.suspicion + operation.delta, 0, 3),
          },
        },
      };
    }
    case 'setFlag':
      return {
        ...state,
        flags: { ...state.flags, [operation.flagId]: operation.value },
      };
    case 'revealBlock': {
      const revealedBlocks = new Set(state.revealedBlocks);
      revealedBlocks.add(operation.blockId);
      return { ...state, revealedBlocks };
    }
    case 'revealEvidenceSection': {
      const revealedEvidenceSections = new Set(state.revealedEvidenceSections);
      revealedEvidenceSections.add(operation.sectionId);
      return { ...state, revealedEvidenceSections };
    }
    case 'revealNotebookEntry': {
      const revealedNotebookEntries = new Set(state.revealedNotebookEntries);
      revealedNotebookEntries.add(operation.entryId);
      return { ...state, revealedNotebookEntries };
    }
    case 'resolveVariant':
      return { ...state, resolvedVariantId: operation.variantId };
  }
}

export function applyEffectDefinition(
  state: RuntimeGameState,
  effect: EffectDefinition,
): RuntimeGameState {
  if (state.appliedEffects.has(effect.id)) {
    return state;
  }

  if (effect.condition && !evaluateCondition(effect.condition, state)) return state;

  let next = state;
  for (const operation of effect.operations) {
    next = applyOperation(next, operation);
  }

  const appliedEffects = new Set(next.appliedEffects);
  appliedEffects.add(effect.id);
  return { ...next, appliedEffects };
}

export function applyEffectDefinitions(
  state: RuntimeGameState,
  effects: readonly EffectDefinition[],
): RuntimeGameState {
  return effects.reduce(applyEffectDefinition, state);
}

