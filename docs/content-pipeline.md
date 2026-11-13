# Content pipeline

How real material gets from the team's Google Drive onto the public site. Drive stays the team's working space; this repository receives only approved, publishable content.

## Where things are

**The team's Drive folder** "Lost n' Found in Pokr Ayrum", linked read-only at `../memo-armenia-summerschool-private/drive`:

| Drive path | Contents |
| --- | --- |
| «индекс: проеты, предметы» (sheet, formerly «Таблица текстов и фото») | The source of truth. Tab «прокты»: projects grouped by studio with ID, authors, title, status, links to text, photos and object, and object conflicts. Tab «предметы»: objects keyed by their photo chip (oNNN.jpg, or oNNN_k.jpg for several photos), with what it is, description, photo numbers, owning project and conflicts |
| «Главная, шапка, подвал и меню» (doc) | Header, home text variants, menu and footer copy |
| «Формат текстов второй страницы» (doc) | Project page template |
| `Работа на посте/все фото/предметы/` | Object photos named by object ID (`o043.jpg`, `o009_1.jpg`…), not yet cut out |
| `Работа на посте/Студия …/проекты/<project>/` | Per-project photos and text docs (some texts are `.docx`) |
| `Работа на посте/все фото/лагерь и проекты/` | Selected camp and project photos |
| `1 смена фотографии/`, `2 смена фотографии/` | Raw per-participant photos and video from both shifts, about 25 GB. Longread source only; never bulk-copy |

Docs and Sheets are only pointer files in the Drive mount; read them through the Executor Google Drive connector (export docs as Markdown and the sheet as CSV; download `.docx` files and convert them).

**The private companion folder** `../memo-armenia-summerschool-private/` is a local git repository with no remote:

- `source-map.yaml`: Drive file IDs, original file names and, for shared docs, the section belonging to each project, mapped to project and object IDs.
- `approvals.yaml`: per project, what the team approved for publication (text revision, display names, photos, video), who approved it and when.
- `staging/<project-id>/`: the latest normalized import.

## Steps

1. **Import.** Read the sheet, then each linked text, through the connector. Write normalized text to `staging/`, update `source-map.yaml`, and commit in the private repository. Review `git diff` against the previous import to see what the team changed.
2. **Resolve.** Raise sheet problems with the team rather than guessing: an object photo listed for two projects, several projects sharing one doc, missing texts or titles. Record each resolution in `source-map.yaml`.
3. **Approve.** A project may go public only when `approvals.yaml` records the team's approval of its current text, display names, photos and video. «готово» in the sheet is not approval. A change after approval needs approval again.
4. **Promote.** Write the approved text into `site/src/content/projects/<project-id>/ru.md`. Run `scripts/import-media` on the chosen originals through the Drive link: it applies orientation, converts HEIC and large JPEGs to sRGB web masters of at most 2400 px, strips metadata and renames to ASCII. Set `published: true`.
5. **Check and ship.** Run `validate`, commit to `main`, and let CI deploy.

Never overwrite local editorial changes silently. When a source disappears from Drive, report it; don't unpublish automatically.

## Object cut-outs

Each object is delivered as a PNG with a transparent background, named by its photo number, with even padding around the object and nothing mirrored. `scripts/import-media` measures the alpha bounds the collage needs, and every cut-out gets a visual check before promotion.

## Before anything real is published

Confirm for each project, outside this repository:

- consent from participants (and a parent or guardian for minors) and from any interviewees;
- permission to publish every photo, text and video;
- the display name or pseudonym and its spelling;
- whether a location can safely be shown;
- credit lines for photos and video;
- any restriction on embedding or reuse.
