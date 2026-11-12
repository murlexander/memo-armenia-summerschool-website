// Renders the Markdown strings stored in project frontmatter (materials, history, fromAuthor).
import { marked } from 'marked';

export function markdown(source: string): string {
  return marked.parse(source, { async: false, gfm: true, breaks: false });
}
