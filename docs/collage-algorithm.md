# Responsive collage algorithm

This is the implementation contract for the prototype collection. It translates the approved vault brief into measurable behavior without treating phone, tablet, and desktop as separate designs.

## Experience target

- The collection feels like a quirky, non-hierarchical field of found cut-outs, not a grid or catalogue.
- Every object is one direct link to a participant project: fine pointers communicate this through motion, while touch layouts show a plain object title and ↗.
- All thirty fictional entries remain present at every width.
- The identity stays light, warm, tactile, and subtly grainy.
- The instruction “Choose an object to open its project.” appears once before the field.

## Object descriptor

The rendered descriptor for every object stores:

- a stable ID and localized project URL;
- localized object label, project title, and useful alternative text;
- intrinsic dimensions and normalized visible-alpha bounds;
- padding around the protected click area;
- optional visual weight; and
- the placeholder cut-out profile used by the prototype.

Every object is one semantic link. Its protected link rectangle is always at least `48 × 48` CSS pixels. The cut-out may extend beyond that rectangle, but the link rectangles and their labels never overlap.

## Placement method

1. A fresh seed is created when the collection mounts. Values are derived from `hash(seed, object ID, property)` so resizing or adding one record cannot scramble unrelated values.
2. The seed controls visual order, width and height variation, rotation, two-dimensional position, layer, mirroring, and peripheral drift.
3. The usable width is the measured collection width after fluid safe gutters.
4. Density is content-based. The solver estimates how many readable footprints the width can support at roughly `184–198` CSS pixels, up to eight. This estimate sizes the plane; it is not a set of columns or lanes.
5. On multi-footprint layouts, every object samples hundreds of continuous `(x, y)` candidates across the whole plane. Candidates are rejected when protected link rectangles overlap, the same placeholder silhouette is too close to itself, four centres would form a narrow horizontal band, or the leading edge would become a flat first row.
6. Remaining candidates are scored as a two-dimensional field. Soft Gaussian penalties resist shared top, centre, and left alignments; local crowding penalties prevent clusters; and a mild isolation penalty prevents empty islands. There is no gravity pass, nearest-neighbour chain, row cycle, or anchor cluster.
7. Fine-pointer cards use compact protected rectangles so the much larger cut-outs can interlock and overlap peripherally without creating overlapping links. Seeded scale, rotation, drift, mirroring, and layer variation prevent identical placeholder assets from reading as a repeated stamp.
8. Placeholder silhouettes are distributed evenly across the thirty fictional records: each of the eleven atlas cells appears two or three times. This is a prototype-only anti-repetition measure, not an editorial rule for future real objects.
9. Single-footprint layouts reserve one plain line for the localized object title and ↗, then give the remaining compact height to a large cut-out. They remain a readable stream rather than forcing narrow label columns.
10. Canvas height is the maximum solved object bottom. Constrained widths become taller instead of hiding content or introducing horizontal scroll.

The seed preserves object order and each object’s visual traits throughout a visit. The density estimate changes only when another readable footprint fits, and returning to a previous measured width reproduces that arrangement.

## Interaction

- Fine-pointer layouts show no resting title or arrow. Hover and keyboard focus raise only the active object, correct its rotation, slightly increase its scale, and strengthen the shadow/outline over `190 ms` without reflow.
- Narrow and non-hover layouts show the localized object title and ↗ at rest. They do not show the project title.
- The touch title has no capsule, border, fill, shadow, blur, or framed arrow. The first tap follows the link.
- There is no autonomous or resting object movement.
- Reduced motion removes animated transitions while preserving focus, contrast, and hierarchy.
- Keyboard order follows the stable seeded collection order for the visit.

## Hard constraints

At every supported width: every object appears exactly once; there is no horizontal scroll; no protected rectangle or visible touch label is clipped; protected links never overlap; targets are at least `48 × 48` CSS pixels; the touch affordance is not hover-dependent; hover/focus never reorders the layout; and narrow layouts never drop objects.

If a future real asset cannot remain legible at the current footprint estimate, reduce the density estimate and re-solve the whole plane. Never solve a collision by clipping content or covering a target.

## Responsive acceptance matrix

| Width condition | Density | Visible overlap | Expected result |
| --- | --- | --- | --- |
| Only one readable footprint fits | 1 footprint | None | Compact single stream; roughly three object cards per `844px` of collection height; first-tap links and resting labels |
| Several readable footprints fit | 2–5 footprint estimate | Negligible to peripheral | Continuous two-dimensional placement; no repeated row, lane, or pair rhythm; object-only presentation on fine pointers |
| Broad plane | 6–8 footprint estimate | Peripheral, targeting the approved 15–20% collage feel | Many enlarged, unrelated objects in view at once; no object becomes the centre of a cluster |

Reference audit points: `320 → 1`, `390 → 1`, `768 → 3`, `1024 → 4`, `1440 → 6`, and `1920 → 8` estimated footprints. These are outcomes of the content-fit calculation, not hard-coded device breakpoints.

## Verification gates

- Pure layout sweep from `280` through `2560` CSS pixels.
- Browser checks at `320`, `390`, `768`, `1024`, `1440`, and `1920` pixels.
- No missing/duplicate object, clipping, horizontal scroll, small target, protected-target collision, repeated instruction, dominant silhouette, or alignment band.
- Same seed preserves object order and reproduces each width; refresh changes the arrangement.
- Collection → project → collection works with a real link.
- English, Armenian, and Russian routes each render all thirty objects and the localized instruction.
- Keyboard focus and reduced-motion behavior remain usable.
- Before real-content launch, test recognition with at least three people, including one older or less web-confident visitor. On touch, a project link should be identifiable within roughly three seconds; otherwise strengthen the plain title, arrow, or instruction without adding a frame.

## Prototype boundary

The current cut-outs and records are fictional placeholders. Real objects, translations, credits, pseudonyms, consent, and sensitive-material decisions require team approval. Map browsing, physics, dragging, and a structured catalogue are outside this collage pass.
