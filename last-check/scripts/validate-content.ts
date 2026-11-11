import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ChapterImportManifestSchema } from '../src/content/chapter-manifest';
import { GAME_CONTENT } from '../src/content/game-content';
import { ChapterDefinitionSchema } from '../src/content/schema';
import { SOURCE_SHA256 } from '../src/content/source';

const projectRoot = process.cwd();
const sourcePath = resolve(projectRoot, 'source', '마지막_확인_전체_시나리오.md');
const manifestPath = resolve(projectRoot, 'src', 'content', 'chapters', 'index.json');
const chaptersDirectory = resolve(projectRoot, 'src', 'content', 'chapters');

const sourceBytes = await readFile(sourcePath);
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== SOURCE_SHA256) {
  throw new Error(`원문 SHA-256 불일치: ${sourceHash}`);
}
const sourceLines = sourceBytes.toString('utf8').split(/\r?\n/);

const manifest = ChapterImportManifestSchema.parse(
  JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
);

const normalizeExcerpt = (text: string): string => text
  .replace(/^E14 (?:미)?보유 시: /, '')
  .replace(/^- D1[^:]*: /, '');
const importedChapterIds: string[] = [];
let importedChoiceCount = 0;
let importedSceneCount = 0;
for (const chapter of manifest.chapters) {
  if (chapter.status === 'pending') continue;
  const chapterPath = resolve(chaptersDirectory, chapter.file as string);
  if (!existsSync(chapterPath)) {
    throw new Error(`imported 챕터 파일 없음: ${chapter.file}`);
  }
  const parsed = ChapterDefinitionSchema.parse(
    JSON.parse(await readFile(chapterPath, 'utf8')) as unknown,
  );
  if (parsed.id !== chapter.id) {
    throw new Error(`챕터 ID 불일치: ${chapter.id} / ${parsed.id}`);
  }
  importedChapterIds.push(parsed.id);
  const expectedSceneCount = chapter.commonSceneCount + chapter.resultSceneCount;
  if (parsed.scenes.filter((scene) => !scene.id.startsWith('END_')).length !== expectedSceneCount) {
    throw new Error(`챕터 장면 수 불일치: ${chapter.id}`);
  }
  importedSceneCount += parsed.scenes.length;

  for (const scene of parsed.scenes) {
    const coveredLines = new Set<number>();
    const checkExcerpt = (
      id: string,
      text: string,
      source: { lineStart: number; lineEnd: number },
    ) => {
      const excerpt = normalizeExcerpt(sourceLines.slice(source.lineStart - 1, source.lineEnd).join('\n').trim());
      if (excerpt !== text) throw new Error(`원문 block 불일치: ${id}`);
      for (let line = source.lineStart; line <= source.lineEnd; line += 1) coveredLines.add(line);
    };
    for (const block of scene.blocks) {
      if (block.content.type === 'fixed') {
        if (block.kind === 'closingLine') {
          if (!scene.id.startsWith('END_') || block.source.lineStart !== 2036 || block.source.lineEnd !== 2036) {
            throw new Error(`종료 문장 예외 위치 오류: ${block.id}`);
          }
        } else if (block.source.lineStart < 225 || block.source.lineEnd > 1892) {
          throw new Error(`개발자 해설 노출: ${block.id}`);
        }
        checkExcerpt(block.id, block.content.text, block.source);
      } else {
        for (const variant of block.content.variants) {
          checkExcerpt(variant.id, variant.text, variant.source);
        }
      }
    }
    for (const instruction of scene.presentationInstructions ?? []) {
      checkExcerpt(instruction.source.stableBlockId, instruction.text, instruction.source);
    }
    for (let line = scene.source.lineStart; line <= scene.source.lineEnd; line += 1) {
      const text = sourceLines[line - 1] ?? '';
      if (
        !text || /^#{2,4} /.test(text) || text.startsWith('입장:') ||
        text.startsWith('기록:') || text.startsWith('- **C') ||
        /^(?:E\d{2} (?:보유|미보유)|완성|미완성|E12·E14·E15·E16 모두 보유|하나라도 미보유) 시:$/.test(text) ||
        text.startsWith('두 경우 모두 다음:')
      ) continue;
      if (!coveredLines.has(line)) throw new Error(`원문 누락: ${scene.id}:${line}`);
    }
    for (const choice of scene.choices) {
      const excerpt = sourceLines
        .slice(choice.source.lineStart - 1, choice.source.lineEnd)
        .join('\n')
        .trim();
      const expected = `- **${choice.id} / ${choice.label} → ${choice.resultSceneId}**`;
      if (excerpt !== expected) {
        throw new Error(`원문 choice 불일치: ${choice.id}`);
      }
      importedChoiceCount += 1;
    }
    const sourceRecord = sourceLines[scene.source.lineEnd - 1] ?? '';
    const expectedNextSceneId = sourceRecord.match(/다음: ([A-Z0-9_]+)\./)?.[1];
    if (expectedNextSceneId && scene.nextSceneId !== expectedNextSceneId) {
      throw new Error(`원문 next 불일치: ${scene.id}`);
    }
    if (!expectedNextSceneId && scene.nextSceneId) {
      throw new Error(`원문에 없는 next: ${scene.id}`);
    }
    const entryLine = sourceLines[scene.source.lineStart] ?? '';
    if (scene.id.startsWith('END_') && (scene.endCommand !== 'TITLE' || !entryLine.includes('끝: TITLE.'))) {
      throw new Error(`엔딩 화면 명령 불일치: ${scene.id}`);
    }
    if (scene.nextVariants) {
      const sourceTargets = [...sourceRecord.matchAll(/END_[A-Z0-9]+/g)].map((match) => match[0]);
      if (sourceTargets.join(',') !== scene.nextVariants.map((route) => route.sceneId).join(',')) {
        throw new Error(`조건부 next 불일치: ${scene.id}`);
      }
    }
  }
}

const runtimeChapterIds = GAME_CONTENT.chapters.map((chapter) => chapter.id);
if (runtimeChapterIds.join(',') !== importedChapterIds.join(',')) {
  throw new Error('런타임 콘텐츠와 imported 챕터 순서가 다릅니다.');
}
const runtimeSceneCount = GAME_CONTENT.chapters.reduce(
  (count, chapter) => count + chapter.scenes.length,
  0,
);
if (runtimeSceneCount !== importedSceneCount) {
  throw new Error('런타임 콘텐츠와 imported 장면 수가 다릅니다.');
}

for (const record of [...GAME_CONTENT.evidenceSections, ...GAME_CONTENT.notebookEntries]) {
  if (record.source.lineStart < 709) continue;
  const excerpt = sourceLines
    .slice(record.source.lineStart - 1, record.source.lineEnd).join('\n').trim();
  if (record.body !== normalizeExcerpt(excerpt)) throw new Error(`수첩 원문 불일치: ${record.id}`);
}

const scenes = GAME_CONTENT.chapters.flatMap((chapter) => chapter.scenes);
const sourceSceneIds = sourceLines.slice(224, 1892).flatMap((line) => {
  const match = /^#{2,4} ((?:CH\d{2}_S\d{2}(?:_[A-C])?)|END_[A-Z0-9]+)(?: —|$)/.exec(line);
  return match ? [match[1]!] : [];
});
if (sourceSceneIds.sort().join(',') !== scenes.map((scene) => scene.id).sort().join(',')) {
  throw new Error('원문 전체 장면 ID와 구현 장면 ID가 다릅니다.');
}
if (
  importedSceneCount !== 82 || importedChoiceCount !== 54 ||
  scenes.filter((scene) => scene.choices.length > 0).length !== 24 ||
  scenes.filter((scene) => scene.id.startsWith('END_')).length !== 4 ||
  GAME_CONTENT.evidence.length !== 15 || GAME_CONTENT.deductions.length !== 6
) throw new Error('전체 콘텐츠 계수 불일치');
for (const ending of scenes.filter((scene) => scene.id.startsWith('END_'))) {
  const last = ending.blocks.at(-1);
  if (last?.kind !== 'closingLine' || ending.blocks.at(-2)?.kind !== 'endingCard') {
    throw new Error(`엔딩 마지막 카드/종료 블록 순서 오류: ${ending.id}`);
  }
}
const pending = manifest.chapters.filter((chapter) => chapter.status === 'pending').length;
console.log(
  `content:validate 통과 — source hash 일치, imported chapters ${importedChapterIds.length}개, scenes ${importedSceneCount}개, choices ${importedChoiceCount}개, pending ${pending}개`,
);
