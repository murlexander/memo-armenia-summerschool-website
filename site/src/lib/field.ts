// Builds the serializable object descriptors for the LOST field at build time.
import { getImage } from 'astro:assets';
import type { FieldObject } from './collage-layout.ts';
import { getObjects, preview, projectHref } from './content.ts';
import { issueLabels, objectIssues } from './issues.ts';

// Cards are at most ~420 px wide on a 2× screen; small cards and phones take the 400 px candidate.
const LONG_EDGES = [400, 800];

export async function getFieldObjects(): Promise<FieldObject[]> {
  const entries = await getObjects();
  return Promise.all(entries.map(async ({ object, project }) => {
    const { data } = object;
    const landscape = data.width >= data.height;
    const long = landscape ? data.width : data.height;
    const widths = LONG_EDGES.filter((edge) => edge < long).concat(long < LONG_EDGES[1] ? [long] : [])
      .map((edge) => Math.round(landscape ? edge : (edge * data.width) / data.height));
    const image = await getImage({ src: data.image, format: 'webp', widths, width: widths.at(-1) });
    return {
      id: data.id,
      href: project ? projectHref(project.data.slug) : undefined,
      label: data.label,
      projectTitle: project?.data.title,
      alt: data.alt,
      image: {
        src: image.src,
        srcset: image.srcSet.attribute,
        width: Number(image.attributes.width),
        height: Number(image.attributes.height),
      },
      issues: preview ? objectIssues(data).map((code) => issueLabels[code]) : undefined,
      intrinsicSize: { width: data.width, height: data.height },
      visibleAlphaBounds: data.bounds,
    };
  }));
}
