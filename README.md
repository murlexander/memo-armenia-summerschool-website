# Person in History — Pokr Ayrum digital museum prototype

Prototype digital museum based on the “Person in History” summer school in the Lori region of Armenia. The current review build contains a responsive object plane, object-first project pages, and a separate research/process record.

The site implementation is in [`prototype/`](prototype/). The scope and technical decisions live in [PROTOTYPE_PLAN.md](PROTOTYPE_PLAN.md), the responsive placement contract lives in [COLLAGE_ALGORITHM.md](COLLAGE_ALGORITHM.md), and the safe content-replacement process lives in [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

The prototype uses fictional sample content and should not be treated as an archive of real objects, people, dates, or projects.

The active site uses the client-only, hash-routed build in `prototype/github-pages/` and is published from the repository's `gh-pages` branch.

Production: https://murlexander.github.io/memo-armenia-summerschool-website/

From `prototype/`, run `npm run validate` to test routing and content invariants, type-check, lint, and build the supported source variants.
