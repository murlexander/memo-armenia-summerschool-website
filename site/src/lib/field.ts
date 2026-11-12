// Builds the serializable object descriptors for the LOST field at build time.
import { getImage } from 'astro:assets';
import type { FieldObject } from './collage-layout.ts';
import { getObjects, localizeObject, localizeProject, projectHref } from './content.ts';
import { uiFor, type Lang } from './ui.ts';

// Cards are at most ~420 px wide on a 2× screen; small cards and phones take the 400 px candidate.
const LONG_EDGES = [400, 800];

export async function getFieldObjects(lang: Lang): Promise<FieldObject[]> {
  const entries = await getObjects();
  const ui = uiFor(lang);
  return Promise.all(entries.map(async ({ object, project }) => {
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
  }));
}
