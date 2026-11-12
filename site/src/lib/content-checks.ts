// Structural content checks for a content directory (fixture or real). Public checks can only
// enforce structure; publication approval is recorded privately (docs/content-pipeline.md).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';
import { z } from 'astro/zod';
import { missingProjectFields, objectSchema, pageSchema, projectSchema, siteSchema } from './schemas.ts';

export type CheckResult = { errors: string[]; warnings: string[]; summary: string };

const pathString = () => z.string().min(1);
const projectFileSchema = projectSchema(pathString);
const objectFileSchema = objectSchema(pathString);

type ProjectRecord = z.infer<typeof projectFileSchema> & { file: string };
type ObjectRecord = z.infer<typeof objectFileSchema> & { file: string };

function readYaml(file: string): unknown {
  return parseYaml(fs.readFileSync(file, 'utf8'));
}

export function splitFrontmatter(source: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { data: {}, body: source };
  return { data: parseYaml(match[1]) ?? {}, body: match[2] };
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
}

function subdirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export async function checkContentDir(root: string, options: { preview: boolean }): Promise<CheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rel = (file: string) => path.relative(root, file);
  // Problems with unpublished content block a preview build but only warn in a public build.
  const report = (published: boolean, message: string) => (published || options.preview ? errors : warnings).push(message);
  // Gaps the preview marks visibly (placeholders, conflict markers) only block published content.
  const gap = (published: boolean, message: string) => (published ? errors : warnings).push(message);

  const requireFile = (entryFile: string, src: string, what: string) => {
    const target = path.resolve(path.dirname(entryFile), src);
    if (!fs.existsSync(target)) errors.push(`${rel(entryFile)}: ${what} not found: ${src}`);
    return target;
  };

  // site.yaml
  const siteFile = path.join(root, 'site.yaml');
  if (!fs.existsSync(siteFile)) {
    errors.push('site.yaml is missing');
  } else {
    const site = siteSchema.safeParse(readYaml(siteFile));
    if (!site.success) errors.push(`site.yaml: ${formatIssues(site.error)}`);
  }

  // Projects
  const projects: ProjectRecord[] = [];
  for (const dir of subdirectories(path.join(root, 'projects'))) {
    const file = path.join(root, 'projects', dir, 'ru.md');
    if (!fs.existsSync(file)) {
      errors.push(`projects/${dir}: ru.md is missing`);
      continue;
    }
    let raw: unknown;
    let body = '';
    try {
      ({ data: raw, body } = splitFrontmatter(fs.readFileSync(file, 'utf8')));
    } catch (error) {
      errors.push(`${rel(file)}: invalid frontmatter (${(error as Error).message})`);
      continue;
    }
    const parsed = projectFileSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${rel(file)}: ${formatIssues(parsed.error)}`);
      continue;
    }
    const project = { ...parsed.data, file };
    projects.push(project);
    if (dir !== project.id) errors.push(`${rel(file)}: folder name must equal id ${project.id}`);
    if (body.trim()) warnings.push(`${rel(file)}: body text is ignored; use the history and fromAuthor fields`);
    if (!project.published && options.preview) {
      for (const field of missingProjectFields(project)) warnings.push(`${rel(file)}: missing ${field} (shown as a placeholder)`);
    }
    for (const media of project.media) {
      if (media.type === 'image') requireFile(file, media.src, 'image');
      else requireFile(file, media.poster, 'YouTube poster');
    }
  }

  // Objects
  const objects: ObjectRecord[] = [];
  for (const dir of subdirectories(path.join(root, 'objects'))) {
    const file = path.join(root, 'objects', dir, 'index.yaml');
    if (!fs.existsSync(file)) {
      errors.push(`objects/${dir}: index.yaml is missing`);
      continue;
    }
    let raw: unknown;
    try {
      raw = readYaml(file);
    } catch (error) {
      errors.push(`${rel(file)}: invalid YAML (${(error as Error).message})`);
      continue;
    }
    const parsed = objectFileSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${rel(file)}: ${formatIssues(parsed.error)}`);
      continue;
    }
    const object = { ...parsed.data, file };
    objects.push(object);
    if (dir !== object.id) errors.push(`${rel(file)}: folder name must equal id ${object.id}`);
    const image = requireFile(file, object.image, 'cut-out');
    if (fs.existsSync(image)) {
      try {
        const metadata = await sharp(image).metadata();
        if (!metadata.hasAlpha) errors.push(`${rel(file)}: cut-out ${object.image} has no transparency`);
        if (metadata.width !== object.width || metadata.height !== object.height) {
          errors.push(`${rel(file)}: width/height ${object.width}×${object.height} do not match the image (${metadata.width}×${metadata.height})`);
        }
      } catch (error) {
        errors.push(`${rel(file)}: unreadable cut-out (${(error as Error).message})`);
      }
    }
  }

  // Identity
  const duplicates = (values: string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  for (const id of duplicates(projects.map((project) => project.id))) errors.push(`duplicate project id ${id}`);
  for (const slug of duplicates(projects.map((project) => project.slug))) errors.push(`duplicate project slug ${slug}`);
  for (const id of duplicates(objects.map((object) => object.id))) errors.push(`duplicate object id ${id}`);

  // Object ↔ project
  const projectsById = new Map<string, ProjectRecord[]>();
  for (const project of projects) projectsById.set(project.id, [...(projectsById.get(project.id) ?? []), project]);
  for (const object of objects) {
    for (const id of object.alsoClaimedBy) {
      if ((projectsById.get(id) ?? []).length !== 1 || id === object.projectId) errors.push(`${rel(object.file)}: alsoClaimedBy names unknown or own project ${id}`);
    }
    if (object.alsoClaimedBy.length > 0) warnings.push(`${rel(object.file)}: also claimed by ${object.alsoClaimedBy.join(', ')}`);
    if (!object.projectId) {
      gap(object.published, `${rel(object.file)}: object has no project`);
      continue;
    }
    const owners = projectsById.get(object.projectId) ?? [];
    if (owners.length !== 1) {
      errors.push(`${rel(object.file)}: needs exactly one project, found ${owners.length} with id ${object.projectId}`);
      continue;
    }
    if (object.published && !owners[0].published) {
      errors.push(`${rel(object.file)}: published object belongs to unpublished project ${object.projectId}`);
    }
  }
  for (const project of projects) {
    const own = objects.filter((object) => object.projectId === project.id);
    const claimed = objects.filter((object) => object.alsoClaimedBy.includes(project.id));
    if (own.length + claimed.length === 0) gap(project.published, `${rel(project.file)}: project has no objects`);
    if (project.published) {
      for (const object of own.filter((item) => !item.published)) {
        errors.push(`${rel(project.file)}: published project references unpublished object ${object.id}`);
      }
    }
  }

  // Longread
  const longreadFile = path.join(root, 'pages', 'pokr-ayrum', 'ru.mdx');
  if (!fs.existsSync(longreadFile)) {
    warnings.push('pages/pokr-ayrum/ru.mdx is missing; the page shows a placeholder');
  } else {
    const { data, body } = splitFrontmatter(fs.readFileSync(longreadFile, 'utf8'));
    const page = pageSchema.safeParse(data);
    if (!page.success) errors.push(`${rel(longreadFile)}: ${formatIssues(page.error)}`);
    const published = page.success && page.data.published;
    for (const tag of body.match(/<Figure\b[^>]*>/g) ?? []) {
      if (!/\balt=("[^"]+"|'[^']+'|\{[^}]+\})/.test(tag)) report(published, `${rel(longreadFile)}: Figure without alt text: ${tag}`);
    }
    for (const tag of body.match(/<YouTube\b[^>]*>/g) ?? []) {
      if (!/\btitle=/.test(tag) || !/\bposter=/.test(tag)) report(published, `${rel(longreadFile)}: YouTube needs title and poster: ${tag}`);
    }
    for (const image of body.match(/!\[\s*\]\([^)]*\)/g) ?? []) {
      report(published, `${rel(longreadFile)}: image without alt text: ${image}`);
    }
    for (const relative of body.match(/(?<=from\s+['"])\.{1,2}\/[^'"]+(?=['"])/g) ?? []) {
      requireFile(longreadFile, relative, 'import');
    }
  }

  const visible = (entry: { published: boolean }) => options.preview || entry.published;
  const summary = `${projects.filter(visible).length} projects and ${objects.filter(visible).length} objects `
    + `${options.preview ? 'in preview (published or not)' : 'published'}; ${projects.length} projects and ${objects.length} objects in total`;
  return { errors, warnings, summary };
}
