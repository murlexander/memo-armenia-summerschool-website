# Agent rules: Lost & Found Покр Айрум website

Start with [README.md](README.md). Read [docs/brief.md](docs/brief.md) before product or design work, [docs/architecture.md](docs/architecture.md) before changing the stack, routes or content model, and [docs/content-pipeline.md](docs/content-pipeline.md) before touching real content.

## Public repository

- Everything committed here is public. Commit only content approved for publication under the content pipeline.
- Never commit Google Drive, Docs, Sheets or Maps links or file IDs: the team's shared folder is editable by anyone holding a link. Also never commit consent or approval records, contact details, unpublished or unapproved material, original media, or image metadata (EXIF, GPS).
- Visitor-facing names are "Lost & Found Покр Айрум" and "Person in History" (Человек в истории). "memo" is Alex's private shorthand: never use it in visitor-facing copy or metadata.
- Many participants are school-age. Show names exactly as approved, and nothing about a participant beyond what was approved.

## Source materials

- The team's Google Drive folder is linked at `../memo-armenia-summerschool-private/drive` (Google Drive for desktop, streaming). Alex has edit rights there, so treat it as read-only: never create, move, rename or delete anything in it. If the link is broken, Drive is not signed in; say so instead of searching elsewhere.
- Never scan it recursively. Files download when read and the folder holds about 30 GB. Don't run `du`, `grep -R`, `cp -R`, `rsync` or image tools over whole folders. List one folder at a time, or use the Drive connector.
- Google Docs and Sheets appear there only as `.gdoc`/`.gsheet` pointer files. Read their content through Alex's Executor Google Drive connector, finding files by name under the folder "Lost n' Found in Pokr Ayrum". The project index is the sheet «Таблица текстов и фото».
- Status «готово» in the sheet means the text is editorially ready, not approved for publication. Publication approval is recorded only in the private `approvals.yaml`.

## Code

- New work goes into the Astro site in `site/` as described in the architecture doc. `prototype/` gets only fixes until it is deleted at the cutover.
- Content is unpublished unless its `published` flag is true, and that flag is set only at promotion, after approval. Content checks must fail the build for an object without exactly one project, or a published project missing objects, alt text or required fields.
- Run the affected package's `validate` script before committing. Submit all completed work to the `main` branch unless Alex directly instructs otherwise.
