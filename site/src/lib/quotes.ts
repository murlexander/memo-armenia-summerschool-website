// «От автора» is shown without the quotation marks around the whole statement; the texts stay as the team wrote them.
// Pure, so the unit tests run in plain Node.

const closing: Record<string, string> = { '“': '”', '«': '»', '„': '“' };
const sentenceEnd = /[.!?…։]$/;

/**
 * Drops the quotation mark that opens the text and the one that closes it: at the very end, or earlier when a stray
 * closing mark ends the text. A text whose opening quote never closes loses just that mark. A quotation that only
 * opens the text, such as an epigraph followed by more text, keeps its marks. Removing a final mark that had nothing
 * after it ends the text with a full stop.
 */
export function unquoteStatement(text: string): string {
  const start = text.search(/\S/);
  const open = text[start];
  const close = closing[open];
  if (start < 0 || !close) return text;

  // Where the opening quote closes, counting quotations of the same kind inside it.
  let depth = 1;
  let closeAt = -1;
  for (let i = start + 1; i < text.length && closeAt < 0; i += 1) {
    if (text[i] === close) depth -= 1;
    else if (text[i] === open) depth += 1;
    if (depth === 0) closeAt = i;
  }
  const end = text.match(new RegExp(`${close}([.!?…։]*)\\s*$`));
  const lastClose = end?.index ?? -1;

  let remove: number[];
  if (closeAt < 0) remove = [start];
  else if (closeAt === lastClose) remove = [start, closeAt];
  else if (lastClose > closeAt && strayClose(text, open, close, closeAt, lastClose)) remove = [start, closeAt, lastClose];
  else return text;

  let result = '';
  let from = 0;
  for (const index of remove.sort((a, b) => a - b)) {
    result += text.slice(from, index);
    from = index + 1;
  }
  result += text.slice(from);
  if (remove.includes(lastClose) && !end?.[1]) {
    const trimmed = result.trimEnd();
    if (!sentenceEnd.test(trimmed)) result = `${trimmed}.${result.slice(trimmed.length)}`;
  }
  return result;
}

/** Whether the closing mark at `at` has no opening mark of its own after `from`. */
function strayClose(text: string, open: string, close: string, from: number, at: number): boolean {
  let depth = 0;
  for (let i = from + 1; i < at; i += 1) {
    if (text[i] === open) depth += 1;
    else if (text[i] === close) depth -= 1;
  }
  return depth <= 0;
}
