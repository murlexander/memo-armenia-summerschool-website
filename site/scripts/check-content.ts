// Checks the content directory the site will build from (SITE_CONTENT_DIR or src/content).
// SITE_PREVIEW=1 treats problems in unpublished content as errors too.
import { contentDir, isPreview } from '../src/lib/build-env.ts';
import { checkContentDir } from '../src/lib/content-checks.ts';

const root = contentDir();
const preview = isPreview();
const result = await checkContentDir(root, { preview });

console.log(`check-content: ${root}${preview ? ' (preview)' : ''}`);
console.log(`  ${result.summary}`);
for (const warning of result.warnings) console.warn(`  warning: ${warning}`);
for (const error of result.errors) console.error(`  error: ${error}`);

if (result.errors.length > 0) {
  console.error(`check-content failed with ${result.errors.length} error(s).`);
  process.exit(1);
}
console.log(`check-content passed${result.warnings.length ? ` with ${result.warnings.length} warning(s)` : ''}.`);
