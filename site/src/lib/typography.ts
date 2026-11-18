// Russian typesetting: a one- or two-letter word (в, и, на, ее…) never ends a line; it stays with the next word.
// Pure, so the unit tests run in plain Node.

const shortWord = /(^|[\s(«„“])([\p{L}]{1,2}) (?=\S)/gu;

/** Joins each one- or two-letter word to the following word with a no-break space. */
export function bindShortWords(text: string): string {
  // A second pass catches runs such as «и ее», where the first match consumes the space the second word needs.
  return text.replace(shortWord, '$1$2 ').replace(shortWord, '$1$2 ');
}
