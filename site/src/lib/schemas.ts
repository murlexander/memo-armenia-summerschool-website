// Content schemas, shared by content.config.ts (Astro) and scripts/check-content.ts (Node).
// The image schema is injected: Astro's image() in the site, a plain path string in the checks.
import { z } from 'astro/zod';

const nonEmpty = z.string().trim().min(1);
const asciiId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}[0-9]+$`), `must look like ${prefix}001`);

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Fields a project needs before it can be shown publicly. Checked for published projects
// by the schema, and for every project by check-content in preview mode.
export function missingProjectFields(project: {
  title: string;
  team: string[];
  materials: string;
  history: string;
}): string[] {
  const missing: string[] = [];
  if (!project.title.trim()) missing.push('title');
  if (project.team.filter((name) => name.trim()).length === 0) missing.push('team');
  if (!project.materials.trim()) missing.push('materials');
  if (!project.history.trim()) missing.push('history');
  return missing;
}

export function projectSchema<I extends z.ZodType>(image: () => I) {
  const imageMedia = z.object({
    type: z.literal('image'),
    src: image(),
    alt: nonEmpty,
    caption: z.string().default(''),
    credit: z.string().default(''),
  });
  const youtubeMedia = z.object({
    type: z.literal('youtube'),
    id: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/, 'must be a YouTube video id'),
    title: nonEmpty,
    poster: image(),
  });
  return z
    .object({
      id: asciiId('p'),
      slug: z.string().regex(slugPattern, 'must be lowercase ASCII words joined by hyphens'),
      published: z.boolean().default(false),
      title: nonEmpty,
      studio: z.string().optional(),
      team: z.array(z.string()).default([]),
      materials: z.string().default(''),
      tags: z.array(z.string()).default([]),
      history: z.string().default(''),
      fromAuthor: z.string().default(''),
      media: z.array(z.discriminatedUnion('type', [imageMedia, youtubeMedia])).default([]),
    })
    .superRefine((project, context) => {
      if (!project.published) return;
      for (const field of missingProjectFields(project)) {
        context.addIssue({ code: 'custom', path: [field], message: `published project ${project.id} needs ${field}` });
      }
    });
}

const unit = z.number().min(0).max(1);

export function objectSchema<I extends z.ZodType>(image: () => I) {
  return z.preprocess(
    // The cut-out always sits next to its record as image.png.
    (raw) => (raw && typeof raw === 'object' && !('image' in raw) ? { ...raw, image: './image.png' } : raw),
    z
      .object({
        id: asciiId('o'),
        projectId: asciiId('p'),
        published: z.boolean().default(false),
        label: nonEmpty,
        alt: nonEmpty,
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        bounds: z.object({ x: unit, y: unit, width: unit.positive(), height: unit.positive() }),
        autoCutout: z.boolean().default(false),
        image: image(),
      })
      .refine((object) => object.bounds.x + object.bounds.width <= 1.0001 && object.bounds.y + object.bounds.height <= 1.0001, {
        message: 'bounds must stay within the image (x + width ≤ 1, y + height ≤ 1)',
        path: ['bounds'],
      }),
  );
}

export const pageSchema = z.object({
  title: nonEmpty.default('Покр Айрум'),
  description: z.string().optional(),
  published: z.boolean().default(false),
});

const homeVariant = z.object({ lead: nonEmpty, keywords: z.array(nonEmpty).optional() });

export const siteSchema = z.object({
  title: nonEmpty,
  phrase: z.string().optional(),
  menu: z.object({ lost: nonEmpty, found: nonEmpty, place: nonEmpty }),
  homeVariants: z.object({ '1': homeVariant, '2': homeVariant, '3': homeVariant }),
  defaultHomeVariant: z.enum(['1', '2', '3']),
  footer: z.object({
    text: nonEmpty,
    partners: z.array(nonEmpty).default([]),
    instagram: z.string().regex(/^[A-Za-z0-9._]+$/).optional(),
  }),
});

export type SiteData = z.infer<typeof siteSchema>;
