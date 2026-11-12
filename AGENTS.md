# Agent rules: Lost & Found Покр Айрум website

Start with [README.md](README.md). Read [docs/brief.md](docs/brief.md) before product or design work, [docs/architecture.md](docs/architecture.md) before changing the stack, routes or content model, and [docs/content-pipeline.md](docs/content-pipeline.md) before touching real content.

## Public repository

- Everything committed here is public. Commit only content approved for publication under the content pipeline.
- Never commit Google Drive, Docs, Sheets or Maps links or file IDs: the team's shared folder is editable by anyone holding a link. Also never commit consent or approval records, contact details, unpublished or unapproved material, original media, or image metadata (EXIF, GPS).
- Exception: the `gh-pages` branch serves the team alpha publicly with `noindex`, every person's name replaced by «[имя]». Deploy it only with `../memo-armenia-summerschool-private/tools/deploy-alpha.mjs`, which redacts, checks and pushes; never push gh-pages any other way. After pushing `site/` changes or changing the alpha content, redeploy so the live alpha stays current. Before deploying new content, add every new person's name to that script's list.
- Visitor-facing names are "Lost & Found Покр Айрум" and "Person in History" (Человек в истории). "memo" is Alex's private shorthand: never use it in visitor-facing copy or metadata.
- Many participants are school-age. Show names exactly as approved, and nothing about a participant beyond what was approved.

## Source materials

- The team's Google Drive folder is linked at `../memo-armenia-summerschool-private/drive` (Google Drive for desktop, streaming). Alex has edit rights there, so never create or delete anything in it. Moving or renaming is allowed only when the right place is obvious, such as an object photo outside the objects folder. Otherwise leave the file where it is: folder placement doesn't matter as long as the index links are correct, and the index never asks the team to reorganize folders. If the link is broken, Drive is not signed in; say so instead of searching elsewhere.
- Never scan it recursively. Files download when read and the folder holds about 30 GB. Don't run `du`, `grep -R`, `cp -R`, `rsync` or image tools over whole folders. List one folder at a time, or use the Drive connector.
- Google Docs and Sheets appear there only as `.gdoc`/`.gsheet` pointer files. Read their content through Alex's Executor Google Drive connector, finding files by name under the folder "Lost n' Found in Pokr Ayrum". The sheet «Таблица текстов и фото» is the source of truth: tab «прокты» lists projects (ID pNNN, authors by studio, title, status with open questions), tab «предметы» lists objects (ID, description, photos, owning project, conflicts).
- Status «готово» in the sheet means the text is editorially ready, not approved for publication. Publication approval is recorded only in the private `approvals.yaml`.

## Code

- New work goes into the Astro site in `site/` as described in the architecture doc. `prototype/` gets only fixes until it is deleted at the cutover.
- Content is unpublished unless its `published` flag is true, and that flag is set only at promotion, after approval. Content checks must fail the build for an object without exactly one project, or a published project missing objects, alt text or required fields.
- Run the affected package's `validate` script before committing. Submit all completed work to the `main` branch unless Alex directly instructs otherwise.
- For any visual change, show the result as screenshots in your report, embedded as images: every affected page at the sizes it changes (phone, portrait tablet, laptop, and wide or zoomed-out desktop as relevant). Take them headlessly with Playwright from the alpha preview and save them under `~/Documents/tmp/memo-armenia-shots/<date>-<topic>/`. Look at them yourself before reporting.
