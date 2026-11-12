// Content queries with the publication gate applied. Pages read content only through here.
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { isPreview } from './build-env.ts';

export type Project = CollectionEntry<'projects'>;
export type MuseumObject = CollectionEntry<'objects'>;

export const preview = isPreview();

/** Normal builds show only published content; preview builds show everything. */
const visible = (entry: { data: { published: boolean } }) => preview || entry.data.published;

export async function getSite() {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('site.yaml is missing from the content directory');
  return entry.data;
}

export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection('projects', visible);
  return projects.sort((a, b) => a.data.id.localeCompare(b.data.id));
}

export type ObjectEntry = {
  object: MuseumObject;
  /** Undefined only in preview, for an object no project has taken yet. */
  project?: Project;
  /** Preview only: other projects that list the same object. */
  claimedBy: Project[];
};

/** Visible objects whose project is visible too (or, in preview, that have none yet), in ID order. */
export async function getObjects(): Promise<ObjectEntry[]> {
  const projects = new Map((await getProjects()).map((project) => [project.data.id, project]));
  const objects = await getCollection('objects', visible);
  return objects
    .flatMap((object) => {
      const { projectId, alsoClaimedBy } = object.data;
      const project = projectId ? projects.get(projectId) : undefined;
      if (projectId ? !project : !preview) return [];
      const claimedBy = alsoClaimedBy.flatMap((id) => projects.get(id) ?? []);
      return [{ object, project, claimedBy }];
    })
    .sort((a, b) => a.object.data.id.localeCompare(b.object.data.id));
}

/** A project's objects: the ones it owns, then (preview only) the ones it shares with another project. */
export function objectsOfProject(entries: ObjectEntry[], projectId: string) {
  return {
    owned: entries.filter(({ object }) => object.data.projectId === projectId),
    claimed: entries.filter(({ claimedBy }) => claimedBy.some((project) => project.data.id === projectId)),
  };
}

export async function getLongread() {
  const page = await getEntry('pages', 'pokr-ayrum');
  return page && visible(page) ? page : undefined;
}

const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** Base-aware internal URL; `path` is site-relative ("found/", "found/slug/"). */
export function href(path = ''): string {
  return baseUrl + path.replace(/^\/+/, '');
}

export const projectHref = (slug: string) => href(`found/${slug}/`);
export const objectAnchor = (id: string) => `object-${id}`;
