import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART_ASSETS } from '../src/engine/visuals';
import { SPRITE_ASSETS } from '../src/engine/sprite-assets';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '..');
const output = join(appRoot, '.review-site');
const base = '/lecture/last-check/';
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
assert.match(commit, /^[a-f0-9]{40}$/);
if (process.env.GITHUB_SHA) assert.equal(commit, process.env.GITHUB_SHA);
const builtHtml = readFileSync(join(appRoot, 'dist/index.html'), 'utf8');
assert(builtHtml.includes(`src="${base}assets/`), 'Build must use the existing Pages base');
assert(builtHtml.includes('name="robots" content="noindex"'), 'Review must retain noindex (not access control)');
assert(!builtHtml.includes('/src/main.tsx'), 'Publish the built entry, not the development entry');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
// Publish only the existing sites' runtime files, with bytes from the same source commit.
// Do not expose their design/context files or copy uncommitted user changes.
const preserved = ['index.html', 'new-site/index.html', 'new-site/app.js', 'new-site/styles.css'];
for (const file of preserved) {
  const target = join(output, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, execFileSync('git', ['show', `${commit}:${file}`], { cwd: repoRoot }));
}
cpSync(join(appRoot, 'dist'), join(output, 'last-check'), { recursive: true });

const files: { path: string; bytes: number; sha256: string }[] = [];
function inspect(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) inspect(path);
    else {
      assert(entry.isFile(), `Only regular runtime files may be published: ${path}`);
      const bytes = readFileSync(path);
      files.push({ path: relative(output, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
inspect(output);
const expectedImages = Object.values(ART_ASSETS).filter(asset => asset.status === 'received');
const imageFiles = files.filter(file => file.path.startsWith('last-check/assets/') && !/\/index-[^/]+\.(js|css)$/.test(file.path));
assert.deepEqual(imageFiles.map(file => file.path).sort(), expectedImages.map(asset => `last-check${asset.publicPath}`).sort(), 'Exact deployed image filename set must match registry');
for (const asset of expectedImages) {
  assert(asset.publicPath && asset.sourcePath);
  const packaged = imageFiles.find(file => file.path === `last-check${asset.publicPath}`)!;
  assert.equal(packaged.sha256, asset.sha256, `packaged image hash: ${asset.id}`);
  const publicBytes = readFileSync(join(appRoot, 'public', asset.publicPath.slice(1)));
  const distBytes = readFileSync(join(appRoot, 'dist', asset.publicPath.slice(1)));
  assert.deepEqual(publicBytes, distBytes, `public/dist mismatch: ${asset.id}`);
  assert.equal(createHash('sha256').update(publicBytes).digest('hex'), packaged.sha256);
  if (asset.format === 'PNG') assert.deepEqual(publicBytes, readFileSync(join(appRoot, asset.sourcePath)), `PNG source mismatch: ${asset.id}`);
}
for (const asset of Object.values(SPRITE_ASSETS).filter(asset => asset.status === 'rejected')) {
  assert.equal(asset.publicPath, null);
  const filename = asset.sourcePath!.split('/').at(-1)!;
  assert(!imageFiles.some(file => file.path.endsWith(`/${filename}`)), `rejected sprite packaged: ${asset.id}`);
  assert(!readdirSync(join(appRoot, 'public/assets')).includes(filename), `rejected sprite in public: ${asset.id}`);
}
assert(files.every(file => preserved.includes(file.path) || file.path === 'last-check/index.html' || file.path.startsWith('last-check/assets/')));
files.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(output, 'last-check/deployment.json'), `${JSON.stringify({ review: true, commit, base, public: true, preserved, files }, null, 2)}\n`);
console.log(JSON.stringify({ commit, base, output, preservedSites: 2, runtimeFiles: files.length, providedImages: expectedImages.length, providedSprites: Object.keys(SPRITE_ASSETS).length, rejectedSprites: Object.values(SPRITE_ASSETS).filter(asset => asset.status === 'rejected').length }));
