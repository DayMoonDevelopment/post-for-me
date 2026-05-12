#!/usr/bin/env node
/* eslint-disable no-undef */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Read the icons-index.json from the installed package
  const iconsIndexPath = join(
    __dirname,
    '..',
    'node_modules',
    '@central-icons',
    'outlined',
    'icons-index.json'
  );

  const iconsData = JSON.parse(readFileSync(iconsIndexPath, 'utf-8'));

  // Collect all unique icons
  const allIcons = [];
  for (const [, categoryData] of Object.entries(iconsData.categories)) {
    allIcons.push(...categoryData.icons);
  }
  const uniqueIcons = [...new Set(allIcons)].sort();

  // Generate markdown content
  let markdown = `# Central Icons

Import from \`@central-icons/outlined\` or \`@central-icons/filled\`.

\`\`\`tsx
import { IconHome } from '@central-icons/outlined'
\`\`\`

## Available Icons (${uniqueIcons.length})

${uniqueIcons.join(', ')}
`;

  // Write the markdown file
  const outputPath = join(__dirname, '..', 'ICONS.md');
  writeFileSync(outputPath, markdown, 'utf-8');

  console.log('✅ Successfully generated ICONS.md with', uniqueIcons.length, 'icons');
} catch (error) {
  console.error('❌ Error generating icons documentation:', error.message);
  // Don't fail the install if this script has issues
  process.exit(0);
}
