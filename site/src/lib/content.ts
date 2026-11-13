// Content queries with the publication gate applied. Pages read content only through here.
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { isPreview } from './build-env.ts';
import { objectStatus, type ObjectStatus } from './issues.ts';
import { defaultLang, langs, type Lang } from './ui.ts';

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
  project: Project;
  /** Preview only: other projects that list the same object. */
  claimedBy: Project[];
};

/** Visible objects whose project is visible too, in ID order. Objects no project has taken yet are left out. */
export async function getObjects(): Promise<ObjectEntry[]> {
  const projects = new Map((await getProjects()).map((project) => [project.data.id, project]));
  const objects = await getCollection('objects', visible);
  return objects
    .flatMap((object) => {
      const { projectId, alsoClaimedBy } = object.data;
      const project = projectId ? projects.get(projectId) : undefined;
      if (!project) return [];
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

/** Whether a project's one object is settled (see objectStatus in issues.ts). */
export function projectObjectStatus(project: Project, owned: ObjectEntry[], claimed: ObjectEntry[]): ObjectStatus {
  return objectStatus(project.data.objectStatus, owned.map(({ object }) => object.data), claimed.length);
}

const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/** Base- and language-aware internal URL; `path` is site-relative ("found/", "found/slug/"). Russian lives at the root. */
export function href(path = '', lang: Lang = defaultLang): string {
  return baseUrl + (lang === defaultLang ? '' : `${lang}/`) + path.replace(/^\/+/, '');
}

export const projectHref = (slug: string, lang: Lang = defaultLang) => href(`found/${slug}/`, lang);

/** The page's language and its site-relative path without the language prefix. */
export function pageLocation(url: URL): { lang: Lang; path: string } {
  const rest = url.pathname.startsWith(baseUrl) ? url.pathname.slice(baseUrl.length) : url.pathname.replace(/^\/+/, '');
  const [first, ...tail] = rest.split('/');
  const lang = langs.find((code) => code !== defaultLang && code === first);
  return lang ? { lang, path: tail.join('/') } : { lang: defaultLang, path: rest };
}
export const objectAnchor = (id: string) => `object-${id}`;

// Localized content. Russian is the source; English and Armenian take their text from translation
// files and return null for anything not written yet, which pages render as a visible placeholder.

/** Names that have a settled form outside Russian, used until a site translation says otherwise. */
const siteDefaults: Record<Exclude<Lang, 'ru'>, { title: string; place: string; partners: Record<string, string> }> = {
  en: { title: 'Lost & Found Pokr Ayrum', place: 'POKR AYRUM', partners: { 'Человек в истории': 'Person in History' } },
  hy: { title: 'Lost & Found Պոկր Այրում', place: 'ՊՈԿՐ ԱՅՐՈՒՄ', partners: { 'Человек в истории': 'Person in History' } },
};

export async function getLocalSite(lang: Lang) {
  const site = await getSite();
  if (lang === defaultLang) return site;
  const translation = (await getEntry('siteTranslations', lang))?.data;
  const defaults = siteDefaults[lang];
  const homeVariants = Object.fromEntries((['1', '2', '3'] as const).map((key) => {
    const own = translation?.homeVariants?.[key];
    const source = site.homeVariants[key];
    return [key, { lead: own?.lead ?? null, keywords: source.keywords ? own?.keywords ?? null : undefined, instruction: source.instruction }];
  })) as Record<'1' | '2' | '3', { lead: string | null; keywords?: string[] | null; instruction: boolean }>;
  return {
    title: translation?.title ?? defaults.title,
    phrase: site.phrase ? translation?.phrase ?? null : undefined,
    menu: {
      lost: translation?.menu?.lost ?? site.menu.lost,
      found: translation?.menu?.found ?? site.menu.found,
      place: translation?.menu?.place ?? defaults.place,
    },
    homeVariants,
    defaultHomeVariant: site.defaultHomeVariant,
    footer: {
      text: translation?.footer?.text ?? null,
      partners: site.footer.partners.map((partner, index) => ({
        ...partner,
        name: translation?.footer?.partners?.[index] ?? defaults.partners[partner.name] ?? partner.name,
      })),
      instagram: site.footer.instagram,
    },
  };
}

export type LocalSite = Awaited<ReturnType<typeof getLocalSite>>;

/** A project's texts in one language. Missing translations and fields the index marks uncertain are null. */
export async function localizeProject(project: Project, lang: Lang) {
  const text = await translateProject(project, lang);
  const uncertain = new Set(project.data.uncertain);
  return {
    ...text,
    title: uncertain.has('title') ? null : text.title,
    team: uncertain.has('team') ? text.team.map(() => null) : text.team,
    materials: uncertain.has('materials') ? null : text.materials,
    history: uncertain.has('history') ? null : text.history,
    fromAuthor: uncertain.has('fromAuthor') ? null : text.fromAuthor,
  };
}

async function translateProject(project: Project, lang: Lang) {
  const { data } = project;
  if (lang === defaultLang) {
    return {
      title: data.title as string | null,
      studio: data.studio as string | null | undefined,
      team: data.team as (string | null)[],
      materials: data.materials as string | null,
      history: data.history as string | null,
      fromAuthor: data.fromAuthor as string | null,
      media: data.media.map((item) => ({ alt: item.type === 'image' ? item.alt : item.title, caption: item.type === 'image' ? item.caption : '' })) as { alt: string | null; caption: string }[],
    };
  }
  const t = (await getEntry('projectTranslations', `${data.id}/${lang}`))?.data;
  // Missing pieces stay null; empty Russian fields stay empty, so placeholders only mark real gaps.
  const text = (own: string | undefined, source: string) => (source.trim() ? own ?? null : own ?? '');
  return {
    title: t?.title ?? null,
    studio: data.studio ? t?.studio ?? null : undefined,
    team: t?.team ?? data.team.map(() => null),
    materials: text(t?.materials, data.materials),
    history: text(t?.history, data.history),
    fromAuthor: text(t?.fromAuthor, data.fromAuthor),
    media: data.media.map((item, index) => ({ alt: t?.media?.[index]?.alt ?? null, caption: item.type === 'image' && item.caption ? t?.media?.[index]?.caption ?? '' : '' })),
  };
}

export type LocalProject = Awaited<ReturnType<typeof localizeProject>>;

/** story: undefined when the object has none, null when it is not translated yet. */
export function localizeObject(object: MuseumObject, lang: Lang): { label: string | null; alt: string | null; story?: string | null } {
  const { label, alt, story } = object.data;
  if (lang === defaultLang) return { label, alt, story };
  const own = object.data.translations[lang];
  return { label: own?.label ?? null, alt: own?.alt ?? null, story: story ? own?.story ?? null : undefined };
}

export async function getLongreadFor(lang: Lang) {
  const page = await getEntry('pages', lang === defaultLang ? 'pokr-ayrum' : `pokr-ayrum/${lang}`);
  return page && visible(page) ? page : undefined;
}

/** Project pages for one language: every project with its objects (outside the preview, only those with objects). */
export async function projectPages() {
  const projects = await getProjects();
  const objects = await getObjects();
  return projects
    .map((project) => ({ slug: project.data.slug, props: { project, ...objectsOfProject(objects, project.data.id) } }))
    // Outside the preview, a project without objects has no page (check-content fails published ones).
    .filter(({ props }) => props.owned.length > 0 || preview);
}
