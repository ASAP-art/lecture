import type { ChoiceId, SceneId } from '../content/ids';

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function orderChoiceIds(
  choiceIds: readonly ChoiceId[],
  seed: number,
  sceneId: SceneId,
): ChoiceId[] {
  const normalizedSeed = seed >>> 0;
  return [...choiceIds].sort((left, right) => {
    const leftHash = stableHash(`${normalizedSeed}:${sceneId}:${left}`);
    const rightHash = stableHash(`${normalizedSeed}:${sceneId}:${right}`);
    return leftHash - rightHash || left.localeCompare(right);
  });
}
