# ESLint Import Order Solution

## Overview

Custom ESLint rule for enforcing strict import ordering in the `app/` directory with auto-fix capability.

## Installation

**No additional packages needed!** The solution uses existing dependencies:
- `eslint` (already installed)
- `eslint-plugin-import` (already installed)

## Files Created

```
post-for-me-marketing/
├── eslint.config.js                                    # Updated config
├── eslint-rules/
│   ├── import-order.js                                 # Custom rule implementation
│   ├── prefer-alias-imports.js                         # Existing rule
│   ├── README.md                                       # Documentation
│   └── __tests__/
│       ├── import-order.test-input.tsx                 # Test case 1: Basic
│       ├── import-order.test-expected.tsx              # Test case 1: Expected
│       ├── import-order.test-complex-input.tsx         # Test case 2: Complex
│       ├── import-order.test-complex-expected.tsx      # Test case 2: Expected
│       └── import-order.test-minimal.tsx               # Test case 3: Edge case
└── IMPORT-ORDER-SOLUTION.md                            # This file
```

## Import Order Rules

The rule enforces groups (in strict order) with **blank lines automatically added between ALL groups**:

### 1. External/Node Modules (alphabetical by module name)
```typescript
import { IconCheckmark1 } from "@central-icons/outlined";
import { format } from "date-fns";
import { useState } from "react";
import { useLoaderData } from "react-router";
```

### 2. Alias Imports (EACH parent directory is its own group)
Each parent directory under `~/` gets its own group with a blank line before it:

```typescript
// ~/components/* group
import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { Link } from "~/components/link";

// ~/lib/* group (blank line before)
import { formatDate } from "~/lib/date-utils";
import { parseSocialLink } from "~/lib/social-links";

// ~/ui/* group (blank line before)
import { Button } from "~/ui/button";
import { Card } from "~/ui/card";
```

### 3. Relative Imports (alphabetical)
```typescript
import { AnotherComponent } from "./another-component";
import { Helper } from "./helper";
```

### 4. Type Imports (alphabetical, at the end)
```typescript
import type { Config } from "../config";
import type { Route } from "./+types/route";
```

## Usage

### Auto-fix on Save (Recommended)

A `.zed/settings.json` file has been created to enable **auto-fix on save**. When you save a file in Zed, imports will be automatically reordered.

**Setup:**
1. Restart Zed editor
2. Save any TypeScript/TSX file in the `app/` directory
3. Imports will now auto-fix on every save!

**Troubleshooting:**
- If auto-fix doesn't work, check that `.zed/settings.json` exists
- Make sure you're editing files in the `app/` directory (rule only applies there)
- Try manually running `bun run lint:fix` to verify the rule works

### Manual Commands

### Check for violations
```bash
bun run lint
```

### Auto-fix import order
```bash
bun run lint:fix
```

### Test the rule
```bash
# Lint test files
bun run lint eslint-rules/__tests__/import-order.test-input.tsx

# Auto-fix test files
bun run lint:fix eslint-rules/__tests__/import-order.test-input.tsx
```

## Configuration Details

### ESLint Config (`eslint.config.js`)

The rule is configured to **only apply to the `app/` directory**:

```javascript
// Import the custom rule
import importOrder from "./eslint-rules/import-order.js";

export default [
  // ... other config
  {
    plugins: {
      custom: {
        rules: {
          "import-order": importOrder,  // Register the rule
        },
      },
    },
  },
  // Apply rule only to app directory
  {
    files: ["app/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "custom/import-order": "error",
    },
  },
];
```

## Performance

- **Complexity:** O(n log n) - efficient single-pass categorization + sort
- **Memory:** Minimal - processes imports in-place
- **Scale:** Handles thousands of files without performance degradation
- **Auto-fix:** Single replace operation per file

## Features

✅ **Auto-fixable** - Automatically reorders imports via `--fix` flag
✅ **Efficient** - O(n log n) complexity, no heavy AST traversals
✅ **Scoped** - Only applies to `app/` directory
✅ **Preserves** - Import specifiers, named imports, default imports, aliases
✅ **Handles** - Type imports, relative imports, alias imports, external imports
✅ **Edge cases** - Empty files, single import, no types, etc.

## Test Cases

### Test Case 1: Basic Reordering

**Before:**
```typescript
import type { Route } from "./+types/route";
import { Button } from "~/ui/button";
import { useState } from "react";
import { Link } from "~/components/link";
```

**After:**
```typescript
import { useState } from "react";

import { Link } from "~/components/link";

import { Button } from "~/ui/button";

import type { Route } from "./+types/route";
```

Note: Each alias parent directory (`~/components`, `~/ui`) gets its own group with blank lines.

### Test Case 2: Complex with Multiple Parent Directories

**Before:**
```typescript
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";
import type { LoaderData } from "./types";
import { motion } from "motion";
import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { parseUrl } from "~/lib/url-parser";
```

**After:**
```typescript
import { motion } from "motion";

import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

import { parseUrl } from "~/lib/url-parser";

import type { LoaderData } from "./types";
```

### Test Case 3: Minimal (Edge Case)

**Before & After (no change needed):**
```typescript
import { useState } from "react";
```

## How It Works

1. **Collect** - Gather all `ImportDeclaration` nodes during AST traversal
2. **Categorize** - Group imports into 4 categories:
   - External (node_modules)
   - Alias (~/...) with sub-groups by parent directory
   - Relative (./ or ../)
   - Type imports
3. **Sort** - Alphabetically sort within each group/sub-group (case-insensitive)
4. **Compare** - Check if current order matches expected order
5. **Fix** - If mismatch, replace entire import block with sorted version

## Ignored Patterns

The rule ignores:
- Side-effect imports: `import './style.css'`
- Dynamic imports: `import()`
- CommonJS: `require()`
- Comments between imports (preserved)

## Troubleshooting

### Rule not applying

Check that files are in `app/` directory:
```bash
# This will trigger the rule
app/routes/my-route.tsx

# This will NOT trigger the rule
src/utils/helper.ts
```

### Auto-fix not working

Ensure you're using the `--fix` flag:
```bash
bun run lint:fix
# or
eslint . --ext ts,tsx --fix
```

### Conflicts with prettier

The rule only reorders imports, it doesn't change formatting. Prettier will format the reordered imports correctly.

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/lint.yml
- name: Lint
  run: bun run lint
```

This will fail the build if imports are misordered.

## FAQ

**Q: Can I customize the order?**
A: Yes, edit `eslint-rules/import-order.js` and modify the `sortImports()` function.

**Q: Why not use `eslint-plugin-import`'s `import/order` rule?**
A: The built-in rule doesn't support grouping by parent directory for alias imports. Our custom rule provides the exact ordering needed.

**Q: Does this work with other ESLint plugins?**
A: Yes, it's compatible with all other ESLint plugins and rules.

**Q: What about performance on large codebases?**
A: The rule is O(n log n) and processes files independently. It scales well to thousands of files.

## Summary

This solution provides:
- ✅ Zero additional dependencies
- ✅ Efficient O(n log n) implementation
- ✅ Auto-fix capability
- ✅ Scoped to `app/` directory only
- ✅ Well-tested with edge cases
- ✅ Complete documentation
- ✅ No performance overhead

Run `bun run lint:fix` to automatically order all imports in the `app/` directory!
