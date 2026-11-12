// Content schemas, shared by content.config.ts (Astro) and scripts/check-content.ts (Node).
// The image schema is injected: Astro's image() in the site, a plain path string in the checks.
import { z } from 'astro/zod';
import { objectIssueCodes, projectIssueCodes } from './issues.ts';

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
      /** Open questions the team preview marks; see issues.ts. */
      issues: z.array(z.enum(projectIssueCodes)).default([]),
    })
    .superRefine((project, context) => {
      if (!project.published) return;
      if (project.issues.length > 0) {
        context.addIssue({ code: 'custom', path: ['issues'], message: `published project ${project.id} still has open issues` });
      }
      for (const field of missingProjectFields(project)) {
        context.addIssue({ code: 'custom', path: [field], message: `published project ${project.id} needs ${field}` });
      }
    });
}

const unit = z.number().min(0).max(1);

// Translations (projects/<id>/en.md, hy.md; site.en.yaml, site.hy.yaml; objects' `translations`).
// Every field is optional: whatever is missing shows as a visible placeholder in that language.
const optionalText = z.string().trim().min(1).optional();

export const projectTranslationSchema = z.object({
  title: optionalText,
  studio: optionalText,
  team: z.array(nonEmpty).optional(),
  materials: optionalText,
  history: optionalText,
  fromAuthor: optionalText,
  /** Same order as the Russian media list. */
  media: z.array(z.object({ alt: optionalText, caption: optionalText })).optional(),
});

const objectTranslation = z.object({ label: optionalText, alt: optionalText });

export const siteTranslationSchema = z.object({
  title: optionalText,
  phrase: optionalText,
  menu: z.object({ lost: optionalText, found: optionalText, place: optionalText }).optional(),
  homeVariants: z.record(z.enum(['1', '2', '3']), z.object({ lead: optionalText, keywords: z.array(nonEmpty).optional() })).optional(),
  footer: z.object({ text: optionalText, partners: z.array(nonEmpty).optional() }).optional(),
});

export function objectSchema<I extends z.ZodType>(image: () => I) {
  return z.preprocess(
    // The cut-out always sits next to its record as image.png.
    (raw) => (raw && typeof raw === 'object' && !('image' in raw) ? { ...raw, image: './image.png' } : raw),
    z
      .object({
        id: asciiId('o'),
        /** The one project that owns the object; unpublished objects may have none yet. */
        projectId: asciiId('p').optional(),
        /** Unpublished only: other projects that list the same object (a conflict to resolve). */
        alsoClaimedBy: z.array(asciiId('p')).default([]),
        /** Open questions the team preview marks; see issues.ts. */
        issues: z.array(z.enum(objectIssueCodes)).default([]),
        /** Label and alt text in English and Armenian. */
        translations: z.object({ en: objectTranslation.optional(), hy: objectTranslation.optional() }).default({}),
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
      })
      .refine((object) => !object.published || (object.projectId && object.alsoClaimedBy.length === 0 && object.issues.length === 0), {
        message: 'a published object needs a project, no other claimants and no open issues',
        path: ['published'],
      }),
  );
}

export const pageSchema = z.object({
  title: nonEmpty.default('Покр Айрум'),
  description: z.string().optional(),
  published: z.boolean().default(false),
});

const homeVariant = z.object({
  lead: nonEmpty,
  keywords: z.array(nonEmpty).optional(),
  /** false when the lead itself invites the visitor to pick an object */
  instruction: z.boolean().default(true),
});

export const siteSchema = z.object({
  title: nonEmpty,
  phrase: z.string().optional(),
  menu: z.object({ lost: nonEmpty, found: nonEmpty, place: nonEmpty }),
  homeVariants: z.object({ '1': homeVariant, '2': homeVariant, '3': homeVariant }),
  defaultHomeVariant: z.enum(['1', '2', '3']),
  footer: z.object({
    text: nonEmpty,
    // A partner is a name, or a name with a link to its site.
    partners: z
      .array(z.union([nonEmpty.transform((name): { name: string; url?: string } => ({ name })), z.object({ name: nonEmpty, url: z.url({ protocol: /^https$/ }) })]))
      .default([]),
    instagram: z.string().regex(/^[A-Za-z0-9._]+$/).optional(),
  }),
});

export type SiteData = z.infer<typeof siteSchema>;
