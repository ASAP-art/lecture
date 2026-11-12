import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { GAME_CONTENT, GAME_INDEX } from '../src/content/game-content';
import type { SceneId } from '../src/content/ids';
import { ART_ASSETS, SCENE_VISUAL_MAPPINGS, type ArtAssetId } from '../src/engine/visuals';
import { ILLUSTRATION_CUES } from '../src/engine/illustrations';
import { PORTRAIT_CUES, UNUSED_SPRITE_REASONS } from '../src/engine/portrait-cues';
import { SPRITE_ASSETS, SPRITE_REJECTION_REASONS } from '../src/engine/sprite-assets';

const spriteManifest = JSON.parse(await readFile(resolve('art-source/incoming/sprites22/IMAGE_MANIFEST.json'), 'utf8')) as {
  file: string; size: string; sha256: string; transparent: boolean;
}[];
assert.deepEqual(spriteManifest.map(entry => entry.file).sort(), Object.keys(SPRITE_ASSETS).map(id => `${id}.png`).sort());
const incomingFiles = await readdir(resolve('art-source/incoming/sprites22'));
for (const asset of Object.values(SPRITE_ASSETS)) {
  assert(asset.sourcePath);
  const filename = basename(asset.sourcePath);
  assert(incomingFiles.includes(filename), `incoming filename case mismatch: ${asset.id}`);
  const entry = spriteManifest.find(item => item.file === filename)!;
  assert.equal(entry.size, `${asset.width}x${asset.height}`);
  assert.equal(entry.sha256, asset.sha256);
  assert.equal(entry.transparent, asset.hasAlpha);
}

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
function imageHeader(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { format: 'PNG', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), alphaChannel: [4, 6].includes(bytes[25]!) };
  }
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length);
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { format: 'WebP', width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1, alphaChannel: Boolean(bytes[20]! & 16) };
  if (chunk === 'VP8 ') return { format: 'WebP', width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff, alphaChannel: false };
  assert.equal(chunk, 'VP8L');
  assert.equal(bytes[20], 0x2f);
  const bits = bytes.readUInt32LE(21);
  return { format: 'WebP', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alphaChannel: Boolean((bits >>> 28) & 1) };
}

const mappings = Object.values(SCENE_VISUAL_MAPPINGS);
assert.deepEqual(mappings.map(m => m.sceneId).sort(), [...GAME_INDEX.scenes.keys()].sort());
assert.equal(mappings.length, 82);
const used = new Set<ArtAssetId>(['title_main']);
for (const mapping of mappings) {
  const scene = GAME_INDEX.scenes.get(mapping.sceneId)!;
  if (mapping.inheritsFrom) {
    assert(GAME_INDEX.scenes.get(mapping.inheritsFrom)?.choices.some(c => c.resultSceneId === mapping.sceneId), `invalid parent: ${mapping.sceneId}`);
    const ancestors = new Set([mapping.sceneId]);
    let parent: string | null = mapping.inheritsFrom;
    while (parent) {
      assert(!ancestors.has(parent), `visual inheritance cycle: ${parent}`);
      ancestors.add(parent);
      parent = SCENE_VISUAL_MAPPINGS[parent]!.inheritsFrom;
    }
  }
  for (const id of [mapping.backgroundId, mapping.portraitId]) if (id) used.add(id);
  for (const portrait of mapping.portraitGroup ?? []) used.add(portrait.assetId);
  for (const override of mapping.blockOverrides) {
    const block = scene.blocks.find(b => b.id === override.blockId);
    assert(block, `foreign block: ${override.blockId}`);
    if (override.variantId) assert(block.content.type === 'conditional' && block.content.variants.some(v => v.id === override.variantId));
    for (const id of [override.backgroundId, override.portraitId]) if (id) used.add(id);
    for (const portrait of override.portraitGroup ?? []) used.add(portrait.assetId);
  }
}
for (const cue of ILLUSTRATION_CUES) {
  const scene = GAME_INDEX.scenes.get(cue.sceneId);
  assert(scene, `missing cue scene: ${cue.sceneId}`);
  assert(scene.blocks.some(b => b.id === cue.blockId), `invalid disclosure cue: ${cue.blockId}`);
  if (cue.hideAtBlockId) assert(scene.blocks.some(b => b.id === cue.hideAtBlockId));
  used.add(cue.assetId);
}
for (const cue of PORTRAIT_CUES) {
  const scene = GAME_INDEX.scenes.get(cue.sceneId);
  assert(scene, `missing portrait scene: ${cue.sceneId}`);
  for (const blockId of cue.blockIds) assert(scene.blocks.some(b => b.id === blockId), `invalid portrait block: ${blockId}`);
  if (cue.disclosedBy) {
    let ancestor: typeof scene | undefined = scene;
    while (ancestor && !ancestor.blocks.some(block => block.id === cue.disclosedBy)) {
      const parent: SceneId | null = SCENE_VISUAL_MAPPINGS[ancestor.id]!.inheritsFrom;
      ancestor = parent ? GAME_INDEX.scenes.get(parent) : undefined;
    }
    assert(ancestor, `invalid portrait disclosure ancestry: ${cue.disclosedBy}`);
  }
  if (cue.variantId) assert(scene.blocks.some(block => block.content.type === 'conditional' &&
    block.content.variants.some(variant => variant.id === cue.variantId)), `invalid portrait variant: ${cue.variantId}`);
  assert.equal(SPRITE_ASSETS[cue.assetId].status, 'received', `rejected portrait cue: ${cue.assetId}`);
  used.add(cue.assetId);
}
for (const id of used) assert(ART_ASSETS[id], `unknown visual asset: ${id}`);

const inventory = [];
const paths: string[] = [];
for (const asset of Object.values(ART_ASSETS)) {
  if (asset.status === 'rejected') {
    assert(asset.sourcePath);
    assert.equal(asset.publicPath, null);
    assert(!used.has(asset.id), `rejected sprite used: ${asset.id}`);
    const original = await readFile(resolve(asset.sourcePath));
    const header = imageHeader(original);
    assert.equal(header.format, asset.format);
    assert.equal(header.width, asset.width);
    assert.equal(header.height, asset.height);
    assert.equal(header.alphaChannel, asset.hasAlpha);
    assert.equal(hash(original), asset.sha256);
    assert(!GAME_CONTENT.assets.some(a => a.id === asset.schemaId));
    for (const directory of ['public/assets', 'dist/assets']) {
      assert(!(await readdir(resolve(directory))).includes(basename(asset.sourcePath)), `rejected sprite deployed: ${asset.id}`);
    }
    inventory.push({ id: asset.id, status: asset.status, applied: false, sourcePath: asset.sourcePath, ...header, sourceBytes: original.length, sourceSha256: hash(original), reason: SPRITE_REJECTION_REASONS[asset.id as keyof typeof SPRITE_REJECTION_REASONS] });
    continue;
  }
  if (asset.status !== 'received') {
    assert.equal(asset.publicPath, null);
    inventory.push({ id: asset.id, status: asset.status, applied: used.has(asset.id) });
    continue;
  }
  assert(asset.publicPath && asset.sourcePath);
  const schema = GAME_CONTENT.assets.find(a => a.id === asset.schemaId);
  assert.equal(schema?.publicPath, asset.publicPath);
  const name = basename(asset.publicPath);
  const bytes = await readFile(resolve('public', asset.publicPath.slice(1)));
  const built = await readFile(resolve('dist', asset.publicPath.slice(1)));
  const original = await readFile(resolve(asset.sourcePath));
  const header = imageHeader(bytes);
  const sourceHeader = imageHeader(original);
  assert.deepEqual(bytes, built, `public/dist mismatch: ${asset.id}`);
  assert.equal(hash(bytes), asset.sha256, `version mismatch: ${asset.id}`);
  assert.equal(header.format, asset.format);
  assert.equal(header.width, asset.width);
  assert.equal(header.height, asset.height);
  assert.equal(header.alphaChannel, asset.hasAlpha);
  assert.equal(sourceHeader.width, asset.width);
  assert.equal(sourceHeader.height, asset.height);
  if (header.format === 'PNG') assert.deepEqual(bytes, original, `PNG source changed: ${asset.id}`);
  const filenameVersion = name.match(/\.([a-f0-9]{12})\.(png|webp)$/);
  if (filenameVersion) assert.equal(filenameVersion[1], asset.sha256!.slice(0, 12));
  paths.push(name);
  inventory.push({ id: asset.id, schemaId: asset.schemaId, status: asset.status, applied: used.has(asset.id), publicPath: asset.publicPath, sourcePath: asset.sourcePath, ...header, bytes: bytes.length, sha256: hash(bytes), sourceBytes: original.length, sourceSha256: hash(original), fit: asset.fit, position: asset.position, alt: asset.alt });
}
const files = await readdir(resolve('public/assets'));
assert.deepEqual(files.sort(), paths.sort(), 'orphan asset or filename case mismatch');
const expectedReceived = Object.values(ART_ASSETS).filter(asset => asset.status === 'received');
assert.deepEqual(GAME_CONTENT.assets.map(asset => asset.id).sort(), expectedReceived.map(asset => asset.schemaId).sort());
assert.equal(Object.values(SPRITE_ASSETS).filter(asset => asset.status === 'received').length, 18);
assert.equal(Object.values(SPRITE_ASSETS).filter(asset => asset.status === 'rejected').length, 4);
assert.equal(paths.length, 40);
const unreceived = inventory.filter(a => a.status === 'unreceived').map(a => a.id);
const rejected = inventory.filter(a => a.status === 'rejected').map(a => a.id);
assert.deepEqual([...rejected].sort(), Object.keys(SPRITE_REJECTION_REASONS).sort());
assert.deepEqual(unreceived.sort(), ['doc_independent_log', 'doc_roster_tags', 'doc_safety_confirmation']);
const unused = inventory.filter(a => a.status === 'received' && !a.applied).map(a => a.id);
const expectedUnused = Object.keys(UNUSED_SPRITE_REASONS).filter(id => SPRITE_ASSETS[id as keyof typeof SPRITE_ASSETS].status === 'received');
assert.deepEqual([...unused].sort(), expectedUnused.sort(), 'Only explicitly documented, narrative-incompatible sprites may remain unused');
for (const [id, reason] of Object.entries(UNUSED_SPRITE_REASONS)) {
  assert(reason.length > 0 && !used.has(id as ArtAssetId), `missing or obsolete unused reason: ${id}`);
}
const summary = { received: paths.length, providedSprites: Object.keys(SPRITE_ASSETS).length, acceptedSprites: 18, rejected, applied: paths.length - unused.length, appliedSprites: PORTRAIT_CUES.length, unused, unusedReasons: UNUSED_SPRITE_REASONS, unreceived, scenePolicies: mappings.length, inheritedScenes: mappings.filter(m => m.inheritsFrom).length, beforeOverrides: mappings.flatMap(m => m.blockOverrides).filter(o => o.timing === 'before').length, afterOverrides: mappings.flatMap(m => m.blockOverrides).filter(o => o.timing === 'after').length, sourceKinds: ['original PNG files', 'runtime versioned files'], note: 'Rejected sprites were provided but are not deployed. Cue inventory is not proof of browser display; resolver disclosure, stored-variant and CG priority remain authoritative.' };
await mkdir(resolve('docs/qa-logs'), { recursive: true });
await writeFile(resolve('docs/qa-logs/art-assets.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary, inventory, mappings, illustrationCues: ILLUSTRATION_CUES, portraitCues: PORTRAIT_CUES }, null, 2) + '\n');
console.log(JSON.stringify({ result: 'pass', ...summary, report: 'docs/qa-logs/art-assets.json' }));
