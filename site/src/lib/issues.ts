// Open questions on unpublished content, recorded from the index. The site no longer lists them (the index
// does); published content may not carry any (the schemas refuse it).

/** Problems recorded by hand in a project's `issues` list. */
export const projectIssueCodes = ['title-tentative', 'team-unconfirmed', 'not-in-sheet', 'object-disputed', 'text-draft'] as const;
/** Problems recorded by hand in an object's `issues` list. */
export const objectIssueCodes = ['object-disputed', 'cutout-check'] as const;
export type IssueCode = (typeof projectIssueCodes)[number] | (typeof objectIssueCodes)[number];

/**
 * One project, one object. In the team preview a project's place on LOST and FOUND shows its object only
 * when that is settled; otherwise a grey circle (uncertain) or a red one (no object known).
 */
export const objectStatuses = ['certain', 'uncertain', 'unknown'] as const;
export type ObjectStatus = (typeof objectStatuses)[number];

/** Project text fields the index can mark as missing or unconfirmed (shown as placeholders in the preview). */
export const uncertainFields = ['title', 'team', 'materials', 'history', 'fromAuthor'] as const;
export type UncertainField = (typeof uncertainFields)[number];

/**
 * The status the index gives a project, or, without one, the status its objects imply: settled only when
 * it owns exactly one object, shares none, and that object has no other claimant or open issue.
 */
export function objectStatus(
  declared: ObjectStatus | undefined,
  owned: { alsoClaimedBy: string[]; issues: readonly IssueCode[] }[],
  claimed: number,
): ObjectStatus {
  if (declared) return declared;
  if (owned.length + claimed === 0) return 'unknown';
  const [only] = owned;
  return owned.length === 1 && claimed === 0 && only.alsoClaimedBy.length === 0 && only.issues.length === 0 ? 'certain' : 'uncertain';
}
