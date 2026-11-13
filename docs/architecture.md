# Architecture

Current technical decisions for the real-content site. The prototype-phase plan is in git history (`PROTOTYPE_PLAN.md`, removed 2026-11-11).

## Stack

- **Astro, static output, TypeScript.** The site is a few page types plus ~40 project pages and a longread, so it needs real shareable URLs, content collections and a build-time image pipeline, not a client-side app.
- **React only for the object field.** The collage is one island. It reuses the seeded solver in `prototype/lib/collage-layout.ts` ([placement contract](collage-algorithm.md)) but receives serializable object descriptors with resolved URLs and alpha bounds. Links are built inside the island; components and callbacks can't cross Astro's hydration boundary.
- **MDX** for the longread, so it can place photos and YouTube embeds inline.
- **One build path, one deploy.** GitHub Actions builds `site/` and deploys it to GitHub Pages, with Astro's `base` set to `/memo-armenia-summerschool-website/` until the project has its own domain. Until the cutover, the `gh-pages` branch serves the team alpha with every name replaced by «[имя]», deployed from the private repo's `tools/deploy-alpha.mjs`; at cutover, delete `prototype/` and the `gh-pages` branch.

## Migration

1. Scaffold `site/`. Prove one real project with several objects, the FOUND catalogue and the longread before importing everything.
2. Check the base path, direct reloads of every route, image paths, keyboard navigation and the browser Back button.
3. Measure the collage with every real cut-out (up to ~100): mobile layout time, image payload, extreme aspect ratios, and scroll position on return.
4. Switch over in one step and remove the prototype's two build variants.

Rename nothing in `prototype/` beforehand. The new site replaces it.

## Routes

| Route | Page |
| --- | --- |
| `/` | LOST: object field and home text |
| `/found/` | FOUND: project catalogue |
| `/found/<slug>/` | Project page |
| `/pokr-ayrum/` | ПОКР АЙРУМ longread |

Russian lives at the root; `/en/` and `/hy/` mirror every page (views in `site/src/views/`, thin routes in `site/src/pages/`). A fixed ENG / RUS / ARM switch in the bottom-right corner links to the same page in each language. Russian is the working version; English and Armenian follow its layout and show a visible placeholder (`Pending`) for every text not yet translated, never Russian text. Open questions and conflict notes appear on the Russian pages only. During review, `?home=1|2|3` switches the home text variant; the chosen variant becomes the default.

## Content model

Astro content collections, read from the directory in `SITE_CONTENT_DIR` (absolute path) or by default `site/src/content/`, which holds a small fictional fixture. Schemas live in `site/src/lib/schemas.ts` and serve both the build and the content checks.

```text
site.yaml                         title, header phrase, menu, home variants (3 has keywords), footer
projects/<project-id>/ru.md       one project, all in frontmatter; its images sit alongside in media/
objects/<object-id>/index.yaml    one object: projectId, label, alt text, pixel size, alpha bounds
objects/<object-id>/image.png     the cut-out, transparent background
pages/pokr-ayrum/ru.mdx           longread; images alongside (en.mdx, hy.mdx for translations)
projects/<project-id>/en.md, hy.md  optional translations: title, studio, team, materials, history, fromAuthor, media alt/caption
site.en.yaml, site.hy.yaml        optional translations of site.yaml text (objects carry theirs under `translations`)
map.yaml, map-base.json           places (name, note, coordinates, projectIds) and the self-drawn base map (OpenStreetMap-derived); shown on ПОКР АЙРУМ and, per project, as «Где это»
```

- **IDs are permanent and ASCII.** Object IDs are the object numbers in the index sheet's «предметы» tab (`o001`…`o093`); the object photos on Drive are named after them (`o043.jpg`, or `o009_1.jpg`… for several). Project IDs are assigned at first import (`p001`…) and never reused. Slugs are transliterated titles; once published, a slug only changes with a redirect from the old one. Titles, file names and sheet rows are mutable and are never used as keys.
- **Each object stores its `projectId` once;** a project's objects are derived. Exactly one owner per object once published. Unpublished objects may still have no project, or list other claimants in `alsoClaimedBy`; projects and objects may carry `issues` codes (`site/src/lib/issues.ts`). Objects without a project are not shown anywhere until one takes them. The team preview shows what is missing as dashed placeholders (text, photos, video, place) and grey or red circles (objects); open questions themselves live in the index, not on the site. Published content can carry none of them.
- **One project, one object.** In the team preview LOST and FOUND give each project one place: its object when that is settled, a grey circle when it is uncertain (a conflict, a link only by description, two objects for one project or two projects for one object), a red circle when none is known. Project pages show the same circle. A project's `objectStatus` (`certain`, `uncertain`, `unknown`) and `uncertain` text fields (`title`, `team`, `materials`, `history`, `fromAuthor`, shown as placeholders) come from the index through the private `tools/sync-index.py`; without `objectStatus` the status is derived from the objects (`objectStatus()` in `issues.ts`). Published projects must be `certain` with no uncertain fields.
- **Project page.** Three blocks: who, from what and the object, with «Где это» (the small map) on the right; «История проекта» and «От автора» with the main photo or video on the right (the film studio's main piece is its video); then the remaining process photos in one row. Photos open full screen. An image may carry a `night` version (the lit lightboxes); the page then offers a day / night switch.
- **Project fields:** `id`, `slug`, `published` (default false), `title`, `team` (display names as approved), `materials` (Из чего сделано), `tags`, `media` (ordered typed records: `image` with alt, caption and credit, or `youtube` with ID, title and a local poster), and the two texts История проекта and От автора as separate fields.
- **Longread:** frontmatter `title`, `description`, `published`. Images are imported relative to the file (`import photo from './media/01.jpg'`) and placed with `<Figure src={photo} alt="…" caption="…" credit="…" />`; video with `<YouTube id="…" title="…" poster={posterImport} />`. Both components are provided by the page, so the MDX file imports only its images.
- **Media:** web masters live next to their content, at most 2400 px on the long edge, sRGB, orientation applied before metadata is stripped. The build generates responsive sizes, which stay out of git. Video is YouTube only, via `youtube-nocookie.com`, and nothing loads from YouTube (thumbnails included) until the visitor presses play.

## Publication gate

- `published` is false by default and is set only by promotion in the [content pipeline](content-pipeline.md). Approval evidence stays private; public checks can only enforce structure.
- Normal builds drop unpublished projects, objects and pages at the content loader, so neither their data nor their images reach the output.
- `site/scripts/check-content.ts` runs in `validate` and CI. It fails on an object without exactly one project, a project without objects, missing alt text or required fields on published content, a published project referencing unpublished objects, cut-out size or transparency mismatches, and duplicate IDs or slugs. Problems in unpublished content are warnings; in preview, structural ones (bad references, files, alt text) fail too, while gaps the preview shows as placeholders stay warnings.
- **Team preview.** `SITE_PREVIEW=1` includes unpublished content, adds `noindex,nofollow,noarchive,noimageindex` to every page and shows a home-variant switcher. The build refuses to run unless `SITE_OUT_DIR` is an absolute path outside this repository.

## Quality bar

Carried over from the prototype: WCAG 2.2 AA, 48 px minimum targets, visible focus, reduced-motion support, usable at 360, 768 and 1440 px and at 200% zoom, Lighthouse ≥ 90, no analytics or third-party requests before consent or interaction, and one self-hosted font family covering Cyrillic, Armenian and Latin. Unit tests cover the solver and content checks; Playwright smoke tests cover every route under the base path.
