# Custom ESLint Rules

This directory contains custom ESLint rules for the Post For Me Marketing project.

## Auto-fix on Save (Zed)

A `.zed/settings.json` file has been created to enable auto-fix on save. When you save a file in Zed, ESLint will automatically reorder imports according to the rules below.

**Setup:**
1. Restart Zed editor
2. Save any TypeScript/TSX file in the `app/` directory
3. Imports should auto-fix on save!

**If auto-fix on save doesn't work:**
- Make sure you're editing files in the `app/` directory (rule only applies there)
- Check that `.zed/settings.json` exists
- Try manually running `bun run lint:fix` to verify the rule works

## Rules

### `custom/import-order`

Enforces strict import ordering across the codebase with auto-fix capability.

**Import Order (strict):**

1. **External/node modules** - Alphabetical by module name
   - All imports from `node_modules` (React, third-party libraries, etc.)

2. **Alias imports** - Each parent directory is its own group
   - All imports using `~/...` alias
   - **Each** top-level directory gets its own group: `~/components/*`, `~/hooks/*`, `~/lib/*`, `~/ui/*`, etc.
   - Groups sorted alphabetically by parent directory name
   - Within each group, sorted alphabetically by full path
   - **Blank line between each parent directory group**

3. **Relative imports** - Alphabetical by path
   - All imports starting with `./` or `../`

4. **Type imports** - Alphabetical by path (at the end)
   - All `import type` statements, regardless of source

**Blank lines are automatically added between all major groups for better readability.**

**Configuration:**

The rule is configured in `eslint.config.js` and **only applies to the `app/` directory**:

```javascript
{
  files: ["app/**/*.{js,jsx,ts,tsx}"],
  rules: {
    "custom/import-order": "error",
  },
}
```

**Usage:**

```bash
# Check for import ordering issues
bun run lint

# Auto-fix import ordering
bun run lint:fix
```

**Performance:**

- **Complexity:** O(n log n) - single sort pass per file
- **Efficiency:** Optimized for large projects with thousands of files
- **Auto-fix:** Reorders imports automatically without manual intervention

**Example:**

Before (misordered):
```typescript
import type { Route } from "./+types/route";
import { Button } from "~/ui/button";
import { useState } from "react";
import { Link } from "~/components/link";
import { format } from "date-fns";
```

After auto-fix:
```typescript
import { format } from "date-fns";
import { useState } from "react";

import { Link } from "~/components/link";

import { Button } from "~/ui/button";

import type { Route } from "./+types/route";
```

Note how each alias parent directory (`~/components`, `~/ui`) is separated by blank lines.

### `custom/prefer-alias-imports`

Enforces the use of alias imports (`~/...`) instead of relative parent imports (`../...`).

**Example:**

```typescript
// ❌ Bad
import { Button } from "../../../ui/button";

// ✅ Good
import { Button } from "~/ui/button";
```

## Testing

Test cases are located in `__tests__/` directory:

- `import-order.test-input.tsx` - Sample file with misordered imports
- `import-order.test-expected.tsx` - Expected output after auto-fix
- `import-order.test-complex-input.tsx` - Complex scenario with multiple imports
- `import-order.test-complex-expected.tsx` - Expected output for complex case
- `import-order.test-minimal.tsx` - Edge case with minimal imports

To test the rule:

```bash
# Run lint on test files
bun run lint eslint-rules/__tests__/import-order.test-input.tsx

# Auto-fix test files
bun run lint:fix eslint-rules/__tests__/import-order.test-input.tsx

# Verify the output matches expected
diff eslint-rules/__tests__/import-order.test-input.tsx eslint-rules/__tests__/import-order.test-expected.tsx
```

## Implementation Details

### File Structure

```
eslint-rules/
├── import-order.js           # Custom import ordering rule
├── prefer-alias-imports.js   # Custom alias import rule
├── __tests__/                # Test cases
│   ├── import-order.test-input.tsx
│   ├── import-order.test-expected.tsx
│   ├── import-order.test-complex-input.tsx
│   ├── import-order.test-complex-expected.tsx
│   └── import-order.test-minimal.tsx
└── README.md                 # This file
```

### How It Works

1. **Categorization:** The rule categorizes all imports into 4 groups:
   - External (node_modules)
   - Alias (~/...) with sub-groups by parent directory
   - Relative (./ or ../)
   - Type imports (import type)

2. **Sorting:** Within each group/sub-group, imports are sorted alphabetically (case-insensitive)

3. **Auto-fix:** If imports are misordered, the rule replaces the entire import block with the correctly ordered version

4. **Efficiency:**
   - Single pass to categorize (O(n))
   - Sort within groups (O(n log n))
   - Single fix operation per file
   - No deep AST traversals or complex regex

### Edge Cases Handled

- ✅ Mixed type/value imports from same module
- ✅ Absolute imports without aliases
- ✅ Files with no imports
- ✅ Files with only one group of imports
- ✅ Side-effect imports (ignored)
- ✅ Dynamic imports (ignored)
- ✅ Import specifiers (named, default, aliases) preserved
- ✅ Comments and whitespace within import statements preserved

## Dependencies

No additional dependencies required. Uses:
- ESLint core APIs
- JavaScript native sorting (locale-aware)
