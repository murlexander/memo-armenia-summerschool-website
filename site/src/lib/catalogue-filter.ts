// FOUND filter: which chips to offer, how a project matches, and how the choice is kept in the URL query
// (?studio=Зины&medium=film,zine). Shared by CatalogueFilters.astro (build) and its script (browser).
import { mediums, shifts, type Medium, type Shift } from './media-kinds.ts';

export const filterKeys = ['studio', 'medium', 'shift'] as const;
export type FilterKey = (typeof filterKeys)[number];

/** Chosen values per group; an empty group does not filter. */
export type FilterState = Record<FilterKey, string[]>;

/** What one catalogue entry offers to the filter (its `data-studio`, `data-medium`, `data-shift`). */
export type FilterFacets = Record<FilterKey, string[]>;

export const emptyFilter = (): FilterState => ({ studio: [], medium: [], shift: [] });

/**
 * The values each group can offer among the given projects: studios in order of first appearance, media and shifts
 * in vocabulary order. A group with fewer than two values cannot narrow anything and is left empty.
 */
export function filterOptions(projects: { studio?: string; medium: readonly Medium[]; shift?: Shift }[]) {
  const studios = [...new Set(projects.flatMap((project) => project.studio?.trim() ? [project.studio] : []))];
  const usedMedia = new Set(projects.flatMap((project) => project.medium));
  const usedShifts = new Set(projects.flatMap((project) => project.shift ?? []));
  const atLeastTwo = <T>(values: T[]) => (values.length >= 2 ? values : []);
  return {
    studio: atLeastTwo(studios),
    medium: atLeastTwo(mediums.filter((medium) => usedMedia.has(medium))),
    shift: atLeastTwo(shifts.filter((shift) => usedShifts.has(shift))),
  };
}

/** OR within a group, AND across groups. */
export function matchesFilter(facets: FilterFacets, state: FilterState): boolean {
  return filterKeys.every((key) => state[key].length === 0 || state[key].some((value) => facets[key].includes(value)));
}

/** Reads the filter from a query string, keeping only values the page offers, in the page's order. */
export function parseFilterQuery(search: string, offered: FilterState): FilterState {
  const params = new URLSearchParams(search);
  const state = emptyFilter();
  for (const key of filterKeys) {
    const asked = new Set(params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()));
    state[key] = offered[key].filter((value) => asked.has(value));
  }
  return state;
}

/** Writes the filter into a query string, keeping any other parameters. Returns '' or '?…'. */
export function filterQuery(state: FilterState, search = ''): string {
  const params = new URLSearchParams(search);
  for (const key of filterKeys) {
    if (state[key].length > 0) params.set(key, state[key].join(','));
    else params.delete(key);
  }
  const query = params.toString().replaceAll('%2C', ',');
  return query ? `?${query}` : '';
}
