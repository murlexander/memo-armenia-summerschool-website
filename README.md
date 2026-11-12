# Lost & Found Покр Айрум

Website for the Person in History (Человек в истории) creative research summer school held with Green Camp in Pokr Ayrum, Lori region, Armenia. It is a small digital museum: visitors start from objects found in the village, open the participants' projects made from them, and read about the place.

**Status, November 2026:** moving from the fictional prototype to real content. The live site shows the team alpha: real but not yet approved material, hidden from search engines, with every person's name replaced by «[имя]».

Live: https://murlexander.github.io/memo-armenia-summerschool-website/

## Site

| Page | What it shows |
| --- | --- |
| LOST (home) | A field of object cut-outs; each object opens its project |
| FOUND | Catalogue of all projects, each opening its project page |
| ПОКР АЙРУМ | Longread about the village with photos and YouTube video |

The menu's three words compose the title. Russian comes first; English and Armenian follow later. The full brief is in [docs/brief.md](docs/brief.md).

## Repository

```text
docs/
  brief.md               What the Person in History team asked for, and open decisions
  architecture.md        Stack, routes, content model, publication gate, deploy
  content-pipeline.md    Drive → private staging → approved content in this repo
  collage-algorithm.md   Placement contract for the object field
  references/            Design references
  brand/                 Partner marks used in tooling
prototype/               Current Vinext + hash-routed GitHub Pages prototype (removed at the Astro cutover)
site/                    Astro site, its content checks and a fictional fixture in site/src/content/
scripts/                 Media import (added with the first real content)
```

Source materials (Google Drive) and editorial records stay outside this public repository, in the private companion folder `../memo-armenia-summerschool-private/`. See [docs/content-pipeline.md](docs/content-pipeline.md).

## Run the site

From `site/` (Node 22.23 or later): `npm ci`, then

- `npm run dev` for the dev server, at `/memo-armenia-summerschool-website/`;
- `npm run validate` to check content, run unit tests, type-check and build into `site/dist/`;
- `npm run test:e2e` for the Playwright smoke tests against that build (`npx playwright install chromium` once).

By default the site builds from the fictional fixture in `site/src/content/`. To build from another content directory, set `SITE_CONTENT_DIR` to its absolute path.

**Team alpha.** A preview build includes unpublished content, so it must be written outside this repository:

```sh
cd site
SITE_CONTENT_DIR=/absolute/path/to/alpha-content \
SITE_OUT_DIR=/absolute/path/outside/this/repo/alpha-site \
npm run alpha
```

`npm run alpha` checks the content (unpublished problems count as errors) and builds with `SITE_PREVIEW=1`; the Astro cache goes to `$SITE_OUT_DIR.cache`. View it with `SITE_PREVIEW=1 SITE_OUT_DIR=… npx astro preview`. Never commit that output. The live alpha is deployed only by the private repo's `tools/deploy-alpha.mjs`, which builds a name-redacted copy and pushes it to `gh-pages`. `npm run dev` with `SITE_PREVIEW=1` works too, but keeps its content cache in the git-ignored `site/.astro/`.

## Run the prototype

From `prototype/`: `npm ci`, then `npm run dev` for the Vinext dev server, or `npm run validate` to test, type-check, lint and build both variants. `npm run build:pages` writes the hash-routed build to `prototype/github-pages-dist/`; it is no longer deployed.
