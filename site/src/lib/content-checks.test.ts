import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkContentDir } from './content-checks.ts';
import { siteDir } from './build-env.ts';

const fixture = path.join(siteDir, 'src', 'content');

function copyFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-content-'));
  fs.cpSync(fixture, dir, { recursive: true });
  return dir;
}

function edit(dir: string, relative: string, change: (text: string) => string) {
  const file = path.join(dir, relative);
  fs.writeFileSync(file, change(fs.readFileSync(file, 'utf8')));
}

async function check(mutate: (dir: string) => void, preview = false) {
  const dir = copyFixture();
  try {
    mutate(dir);
    return await checkContentDir(dir, { preview });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const hasError = (errors: string[], pattern: RegExp) => assert.ok(errors.some((error) => pattern.test(error)), `expected ${pattern} in:\n${errors.join('\n')}`);

test('the fixture passes in public and preview mode', async () => {
  for (const preview of [false, true]) {
    const result = await checkContentDir(fixture, { preview });
    assert.deepEqual(result.errors, []);
  }
});

test('an object must belong to exactly one existing project', async () => {
  const result = await check((dir) => edit(dir, 'objects/o9003/index.yaml', (text) => text.replace('projectId: p902', 'projectId: p999')));
  hasError(result.errors, /needs exactly one project, found 0/);
});

test('duplicate ids and slugs fail', async () => {
  const result = await check((dir) => {
    edit(dir, 'projects/p902/ru.md', (text) => text.replace('slug: primer-proekta-2', 'slug: primer-proekta-1'));
    fs.cpSync(path.join(dir, 'objects/o9005'), path.join(dir, 'objects/o9006'), { recursive: true });
  });
  hasError(result.errors, /duplicate project slug primer-proekta-1/);
  hasError(result.errors, /duplicate object id o9005/);
  hasError(result.errors, /folder name must equal id o9005/);
});

test('a published project needs objects, all of them published', async () => {
  const noObjects = await check((dir) => fs.rmSync(path.join(dir, 'objects/o9003'), { recursive: true }));
  hasError(noObjects.errors, /p902\/ru\.md: project has no objects/);
  const unpublished = await check((dir) => edit(dir, 'objects/o9004/index.yaml', (text) => text.replace('published: true', 'published: false')));
  hasError(unpublished.errors, /published project references unpublished object o9004/);
});

test('a published project needs its required fields and image alt text', async () => {
  const result = await check((dir) => edit(dir, 'projects/p901/ru.md', (text) => text
    .replace(/history: \|[\s\S]*?fromAuthor:/, 'history: ""\nfromAuthor:')
    .replace('alt: "Абстрактная композиция-заглушка: терракотовый фон и зелёный круг"', 'alt: ""')));
  hasError(result.errors, /published project p901 needs history/);
  hasError(result.errors, /media\.1\.alt/);
});

test('gaps in unpublished content only warn, in public and preview mode alike', async () => {
  const unpublish = (dir: string) => {
    edit(dir, 'projects/p903/ru.md', (text) => text.replace('published: true', 'published: false').replace(/team: \[.*\]/, 'team: []'));
    for (const id of ['o9004', 'o9005']) edit(dir, `objects/${id}/index.yaml`, (text) => text.replace('published: true', 'published: false'));
    fs.rmSync(path.join(dir, 'objects/o9004'), { recursive: true });
    fs.rmSync(path.join(dir, 'objects/o9005'), { recursive: true });
  };
  const publicResult = await check(unpublish);
  assert.deepEqual(publicResult.errors, []);
  assert.ok(publicResult.warnings.some((warning) => /p903\/ru\.md: project has no objects/.test(warning)));
  const previewResult = await check(unpublish, true);
  assert.deepEqual(previewResult.errors, []);
  assert.ok(previewResult.warnings.some((warning) => /p903\/ru\.md: missing team/.test(warning)));
  assert.ok(previewResult.warnings.some((warning) => /p903\/ru\.md: project has no objects/.test(warning)));
});

test('unpublished objects may lack a project or be claimed twice; published ones may not', async () => {
  const orphan = await check((dir) => edit(dir, 'objects/o9004/index.yaml', (text) => text.replace('published: true', 'published: false').replace(/projectId: p\d+\n/, '')), true);
  assert.ok(orphan.warnings.some((warning) => /o9004\/index\.yaml: object has no project/.test(warning)));
  const published = await check((dir) => edit(dir, 'objects/o9001/index.yaml', (text) => `${text}alsoClaimedBy: [p902]\n`));
  hasError(published.errors, /o9001\/index\.yaml: published: a published object needs a project/);
  const unknown = await check((dir) => edit(dir, 'objects/o9001/index.yaml', (text) => `${text.replace('published: true', 'published: false')}alsoClaimedBy: [p999]\n`));
  hasError(unknown.errors, /alsoClaimedBy names unknown or own project p999/);
});

test('cut-out metadata must match the image', async () => {
  const result = await check((dir) => edit(dir, 'objects/o9001/index.yaml', (text) => text.replace('width: 900', 'width: 901')));
  hasError(result.errors, /do not match the image/);
});

test('missing media files and longread alt text fail', async () => {
  const result = await check((dir) => {
    fs.rmSync(path.join(dir, 'projects/p902/media/yt-poster.jpg'));
    edit(dir, 'pages/pokr-ayrum/ru.mdx', (text) => text.replace(/ alt="[^"]*"/, ''));
  });
  hasError(result.errors, /YouTube poster not found/);
  hasError(result.errors, /Figure without alt text/);
});
