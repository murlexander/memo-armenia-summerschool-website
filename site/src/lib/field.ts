// Builds the serializable object descriptors for the LOST field at build time.
import { getImage } from 'astro:assets';
import type { FieldObject } from './collage-layout.ts';
import { getObjects, projectHref } from './content.ts';

const LONG_EDGE = 800;

export async function getFieldObjects(): Promise<FieldObject[]> {
  const entries = await getObjects();
  return Promise.all(entries.map(async ({ object, project }) => {
    const { data } = object;
    const landscape = data.width >= data.height;
    const image = await getImage({
      src: data.image,
      format: 'webp',
      ...(landscape ? { width: Math.min(LONG_EDGE, data.width) } : { height: Math.min(LONG_EDGE, data.height) }),
    });
    return {
      id: data.id,
      href: projectHref(project.data.slug),
      label: data.label,
      projectTitle: project.data.title,
      alt: data.alt,
      image: {
        src: image.src,
        width: Number(image.attributes.width),
        height: Number(image.attributes.height),
      },
      intrinsicSize: { width: data.width, height: data.height },
      visibleAlphaBounds: data.bounds,
    };
  }));
}
