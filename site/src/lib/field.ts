// Builds the serializable object descriptors for the LOST field at build time.
import { getImage } from 'astro:assets';
import type { FieldObject } from './collage-layout.ts';
import { getObjects, getProjects, localizeObject, localizeProject, objectsOfProject, preview, projectHref, projectObjectStatus, type ObjectEntry } from './content.ts';
import { uiFor, type Lang } from './ui.ts';

// Cards are at most ~420 px wide on a 2× screen; small cards and phones take the 400 px candidate.
const LONG_EDGES = [400, 800];

// A placeholder circle's "cut-out": a square that its visible disc fills completely.
const CIRCLE = { intrinsicSize: { width: 1000, height: 1000 }, visibleAlphaBounds: { x: 0, y: 0, width: 1, height: 1 } };

/**
 * Published builds: every visible object. Team preview: one place per project (one project, one object),
 * holding its object when that is settled and a circle otherwise.
 */
export async function getFieldObjects(lang: Lang): Promise<FieldObject[]> {
  const entries = await getObjects();
  if (!preview) return Promise.all(entries.map((entry) => fieldObject(entry, lang)));
  const ui = uiFor(lang);
  const projects = await getProjects();
  return Promise.all(projects.map(async (project) => {
    const { owned, claimed } = objectsOfProject(entries, project.data.id);
    const status = projectObjectStatus(project, owned, claimed);
    if (status === 'certain') return fieldObject(owned[0], lang);
    const title = (await localizeProject(project, lang)).title ?? ui.pendingTitle;
    return {
      id: project.data.id,
      href: projectHref(project.data.slug, lang),
      label: title,
      story: status === 'unknown' ? ui.noObject : ui.objectUncertain,
      projectTitle: title,
      alt: '',
      placeholder: status,
      ...CIRCLE,
    };
  }));
}

async function fieldObject({ object, project }: ObjectEntry, lang: Lang): Promise<FieldObject> {
  const ui = uiFor(lang);
  const { data } = object;
  const text = localizeObject(object, lang);
  const projectTitle = (await localizeProject(project, lang)).title;
  const landscape = data.width >= data.height;
  const long = landscape ? data.width : data.height;
  const widths = LONG_EDGES.filter((edge) => edge < long).concat(long < LONG_EDGES[1] ? [long] : [])
    .map((edge) => Math.round(landscape ? edge : (edge * data.width) / data.height));
  const image = await getImage({ src: data.image, format: 'webp', widths, width: widths.at(-1) });
  return {
    id: data.id,
    href: projectHref(project.data.slug, lang),
    label: text.label ?? ui.pendingTitle,
    story: text.story === undefined ? undefined : text.story ?? ui.pendingText,
    projectTitle: projectTitle ?? ui.pendingTitle,
    alt: text.alt ?? ui.pendingAlt,
    image: {
      src: image.src,
      srcset: image.srcSet.attribute,
      width: Number(image.attributes.width),
      height: Number(image.attributes.height),
    },
    intrinsicSize: { width: data.width, height: data.height },
    visibleAlphaBounds: data.bounds,
  };
}
