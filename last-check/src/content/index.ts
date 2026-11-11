import type {
  BlockDefinition,
  EffectDefinition,
  EvidenceDefinition,
  EvidenceSectionDefinition,
  GameContent,
  NotebookEntryDefinition,
  SceneDefinition,
} from './schema';

export interface GameContentIndex {
  readonly content: GameContent;
  readonly scenes: ReadonlyMap<string, SceneDefinition>;
  readonly blocks: ReadonlyMap<string, BlockDefinition>;
  readonly effects: ReadonlyMap<string, EffectDefinition>;
  readonly evidence: ReadonlyMap<string, EvidenceDefinition>;
  readonly evidenceSections: ReadonlyMap<string, EvidenceSectionDefinition>;
  readonly notebookEntries: ReadonlyMap<string, NotebookEntryDefinition>;
  readonly unimplementedScenes: ReadonlySet<string>;
}

const indexById = <T extends { id: string }>(items: readonly T[]) =>
  new Map(items.map((item) => [item.id, item] as const));

export function createGameContentIndex(content: GameContent): GameContentIndex {
  const scenes = content.chapters.flatMap((chapter) => chapter.scenes);
  return {
    content,
    scenes: indexById(scenes),
    blocks: indexById(scenes.flatMap((scene) => scene.blocks)),
    effects: indexById(content.effects),
    evidence: indexById(content.evidence),
    evidenceSections: indexById(content.evidenceSections),
    notebookEntries: indexById(content.notebookEntries),
    unimplementedScenes: new Set(content.unimplementedSceneIds),
  };
}
