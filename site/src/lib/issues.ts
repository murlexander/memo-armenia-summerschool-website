// Open questions on unpublished content. The team preview marks them visibly; published content
// may not carry any (the schemas refuse it), so public builds never show them.

/** Problems recorded by hand in a project's `issues` list. */
export const projectIssueCodes = ['title-tentative', 'team-unconfirmed', 'not-in-sheet', 'object-disputed', 'text-draft'] as const;
/** Problems recorded by hand in an object's `issues` list. */
export const objectIssueCodes = ['object-disputed', 'cutout-check'] as const;
/** Problems derived from the content itself. */
const derivedIssueCodes = ['no-object', 'shared-object', 'no-text', 'no-photos', 'no-team'] as const;

export type IssueCode = (typeof projectIssueCodes)[number] | (typeof objectIssueCodes)[number] | (typeof derivedIssueCodes)[number];

export const issueLabels: Record<IssueCode, string> = {
  'title-tentative': 'Название не утверждено',
  'team-unconfirmed': 'Состав команды не сверен',
  'not-in-sheet': 'Проекта нет в таблице',
  'object-disputed': 'Источники расходятся, чей это предмет',
  'text-draft': 'Текст — черновик без шаблона',
  'cutout-check': 'Вырезку нужно поправить',
  'no-object': 'Предмет не выбран',
  'shared-object': 'Предмет указан у двух проектов',
  'no-text': 'Текста пока нет',
  'no-photos': 'Фото пока нет',
  'no-team': 'Команда не указана',
};

export function projectIssues(
  project: { issues: readonly IssueCode[]; team: string[]; history: string; fromAuthor: string; media: unknown[] },
  objects: { owned: number; claimed: number },
): IssueCode[] {
  const derived: IssueCode[] = [];
  if (objects.owned + objects.claimed === 0) derived.push('no-object');
  if (objects.claimed > 0) derived.push('shared-object');
  if (!project.history.trim() && !project.fromAuthor.trim()) derived.push('no-text');
  if (project.media.length === 0) derived.push('no-photos');
  if (project.team.every((name) => !name.trim())) derived.push('no-team');
  return [...new Set([...derived, ...project.issues])];
}

export function objectIssues(object: { issues: readonly IssueCode[]; alsoClaimedBy: string[] }): IssueCode[] {
  const derived: IssueCode[] = [];
  if (object.alsoClaimedBy.length > 0) derived.push('shared-object');
  return [...new Set([...derived, ...object.issues])];
}
