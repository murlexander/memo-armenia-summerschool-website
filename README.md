# Lost & Found Покр Айрум

Website for the Person in History (Человек в истории) creative research summer school held with Green Camp in Pokr Ayrum, Lori region, Armenia. It is a small digital museum: visitors start from objects found in the village, open the participants' projects made from them, and read about the place.

**Status, November 2026:** moving from the fictional prototype to real content. The live site still shows the prototype's fictional sample entries.

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
site/                    Astro site with its content (created by the migration in docs/architecture.md)
scripts/                 Media import and content checks (added with the first real content)
```

Source materials (Google Drive) and editorial records stay outside this public repository, in the private companion folder `../memo-armenia-summerschool-private/`. See [docs/content-pipeline.md](docs/content-pipeline.md).

## Run the prototype

From `prototype/`: `npm ci`, then `npm run dev` for the Vinext dev server, or `npm run validate` to test, type-check, lint and build both variants. The live site is the hash-routed build: `npm run build:pages` writes `prototype/github-pages-dist/`, which is published as the `gh-pages` branch.
