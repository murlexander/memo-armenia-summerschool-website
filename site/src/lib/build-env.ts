// Build environment: where content comes from and whether this is a team preview.
// Used by astro.config.ts, content.config.ts and scripts/check-content.ts (Node only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Env = Record<string, string | undefined>;

export const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const repoDir = path.dirname(siteDir);

export function isPreview(env: Env = process.env): boolean {
  return env.SITE_PREVIEW === '1';
}

/** Absolute content directory: SITE_CONTENT_DIR or the public fixture in site/src/content. */
export function contentDir(env: Env = process.env): string {
  const value = env.SITE_CONTENT_DIR;
  if (!value) return path.join(siteDir, 'src', 'content');
  if (!path.isAbsolute(value)) throw new Error(`SITE_CONTENT_DIR must be an absolute path, got "${value}"`);
  if (!fs.existsSync(value)) throw new Error(`SITE_CONTENT_DIR does not exist: ${value}`);
  return path.resolve(value);
}

/** Resolve symlinks for the longest existing prefix, so /tmp and /private/tmp compare equal. */
function realPathLoose(target: string): string {
  let existing = path.resolve(target);
  const rest: string[] = [];
  while (!fs.existsSync(existing)) {
    rest.unshift(path.basename(existing));
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  return path.join(fs.realpathSync(existing), ...rest);
}

export function isInside(child: string, parent: string): boolean {
  const relative = path.relative(realPathLoose(parent), realPathLoose(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Output and cache directories for a preview build. Preview output may contain unpublished
 * material, so it must never be written inside this public repository.
 */
export function previewDirs(env: Env = process.env): { outDir: string; cacheDir: string } {
  const value = env.SITE_OUT_DIR;
  if (!value || !path.isAbsolute(value)) {
    throw new Error('SITE_PREVIEW=1 requires SITE_OUT_DIR: an absolute path outside the public repository.');
  }
  const outDir = path.resolve(value);
  if (isInside(outDir, repoDir)) {
    throw new Error(`SITE_OUT_DIR must be outside the public repository (${repoDir}), got ${outDir}`);
  }
  return { outDir, cacheDir: `${outDir}.cache` };
}
