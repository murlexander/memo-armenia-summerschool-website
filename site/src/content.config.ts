import { defineCollection } from 'astro:content';
import { file, glob, type Loader } from 'astro/loaders';
import { parse as parseYaml } from 'yaml';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { contentDir, isPreview } from './lib/build-env.ts';
import { objectSchema, pageSchema, projectSchema, siteSchema } from './lib/schemas.ts';

const root = contentDir();
const base = (...segments: string[]) => pathToFileURL(path.join(root, ...segments) + path.sep);
const idFromData = ({ entry, data }: { entry: string; data: Record<string, unknown> }) =>
  typeof data.id === 'string' ? data.id : entry.split('/')[0];

/**
 * Publication gate at the source: outside preview, unpublished entries never enter the data
 * store, so neither their data nor their images (registered on store.set) reach the build.
 */
function publishedOnly(loader: Loader): Loader {
  if (isPreview()) return loader;
  return {
    ...loader,
    load: (context) => loader.load({
      ...context,
      store: new Proxy(context.store, {
        get(target, property, receiver) {
          if (property === 'set') {
            return (entry: Parameters<typeof target.set>[0]) => {
              if ((entry.data as { published?: unknown }).published === true) return target.set(entry);
              target.delete(entry.id); // drop an entry cached while it was still published
              return false;
            };
          }
          const value: unknown = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }),
    }),
  };
}

const projects = defineCollection({
  loader: publishedOnly(glob({ pattern: '*/ru.md', base: base('projects'), generateId: idFromData })),
  schema: ({ image }) => projectSchema(image),
});

const objects = defineCollection({
  loader: publishedOnly(glob({ pattern: '*/index.yaml', base: base('objects'), generateId: idFromData })),
  schema: ({ image }) => objectSchema(image),
});

const pages = defineCollection({
  loader: publishedOnly(glob({ pattern: '*/ru.mdx', base: base('pages'), generateId: ({ entry }) => entry.split('/')[0] })),
  schema: pageSchema,
});

const site = defineCollection({
  // site.yaml is one record, not a map of entries.
  loader: file(path.join(root, 'site.yaml'), { parser: (text) => ({ site: parseYaml(text) as Record<string, unknown> }) }),
  schema: siteSchema,
});

export const collections = { projects, objects, pages, site };
