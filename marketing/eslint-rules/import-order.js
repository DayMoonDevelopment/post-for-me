/**
 * Custom ESLint rule for enforcing strict import ordering
 *
 * Groups (in order, with blank lines between groups):
 * 1. External/node modules (alphabetical by module name)
 * 2. Alias imports (~/*) grouped by parent directory, alphabetical within groups
 * 3. Relative imports (./ or ../) alphabetical by path
 * 4. Type imports (alphabetical by path)
 *
 * Auto-fixable via --fix flag
 * O(n log n) complexity - single sort pass per file
 */

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce consistent import ordering across the codebase",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    messages: {
      wrongOrder: "Imports are not properly ordered. Run eslint --fix to auto-sort.",
    },
    schema: [],
  },

  create(context) {
    // ESLint v9+ uses context.sourceCode, v8 uses context.getSourceCode()
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const imports = [];

    return {
      ImportDeclaration(node) {
        imports.push(node);
      },

      "Program:exit"() {
        if (imports.length === 0) return;

        // Categorize and sort imports
        const categorized = categorizeImports(imports);
        const sortedImportsWithMeta = sortImports(categorized);

        // Build expected text with blank line separators between groups
        const expectedText = buildImportText(sortedImportsWithMeta, sourceCode);

        // Get current text (entire range from first to last import)
        const firstImport = imports[0];
        const lastImport = imports[imports.length - 1];
        const rangeStart = firstImport.range[0];
        const rangeEnd = lastImport.range[1];
        const currentText = sourceCode.text.substring(rangeStart, rangeEnd);

        // Check if reordering needed
        if (currentText !== expectedText) {
          context.report({
            node: firstImport,
            messageId: "wrongOrder",
            fix(fixer) {
              return fixer.replaceTextRange([rangeStart, rangeEnd], expectedText);
            },
          });
        }
      },
    };
  },
};

/**
 * Categorize imports into groups
 * @param {Array} imports - Array of import declaration nodes
 * @returns {Object} Categorized imports
 */
function categorizeImports(imports) {
  const categories = {
    external: [],      // node_modules
    aliasGroups: {},   // ~/component/*, ~/lib/*, etc.
    relative: [],      // ./ or ../
    types: [],         // import type
  };

  for (const node of imports) {
    const importPath = node.source.value;
    const isTypeImport = node.importKind === 'type';

    // Type imports always go to types category
    if (isTypeImport) {
      categories.types.push(node);
      continue;
    }

    // Check for alias imports (~/...)
    if (importPath.startsWith('~/')) {
      const pathParts = importPath.slice(2).split('/');
      const parentDir = pathParts[0]; // e.g., 'components', 'lib', 'ui'

      if (!categories.aliasGroups[parentDir]) {
        categories.aliasGroups[parentDir] = [];
      }
      categories.aliasGroups[parentDir].push(node);
      continue;
    }

    // Check for relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      categories.relative.push(node);
      continue;
    }

    // Everything else is external
    categories.external.push(node);
  }

  return categories;
}

/**
 * Sort imports within their categories and return flat sorted array with metadata
 * @param {Object} categories - Categorized imports
 * @returns {Array<{node: Object, addNewlineBefore: boolean}>} Sorted imports with separator flags
 */
function sortImports(categories) {
  const sorted = [];
  const sortAlphabetically = (a, b) =>
    a.source.value.localeCompare(b.source.value, 'en', { sensitivity: 'base' });

  // Helper to add imports to sorted array with group separator flag
  const addImportGroup = (imports) => {
    imports.forEach((node, index) => {
      sorted.push({
        node,
        // Add blank line before first import of a new group (if not the very first import)
        addNewlineBefore: index === 0 && sorted.length > 0
      });
    });
  };

  // 1. External imports (alphabetical by module name)
  const externalSorted = categories.external.sort(sortAlphabetically);
  addImportGroup(externalSorted);

  // 2. Alias imports grouped by parent directory
  // Each parent directory gets its own group with blank line separator
  const aliasParentDirs = Object.keys(categories.aliasGroups).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  aliasParentDirs.forEach((parentDir) => {
    const groupImports = categories.aliasGroups[parentDir].sort(sortAlphabetically);
    addImportGroup(groupImports);
  });

  // 3. Relative imports (alphabetical)
  const relativeSorted = categories.relative.sort(sortAlphabetically);
  addImportGroup(relativeSorted);

  // 4. Type imports (alphabetical) - always at the end
  const typesSorted = categories.types.sort(sortAlphabetically);
  addImportGroup(typesSorted);

  return sorted;
}

/**
 * Build the final import text with proper spacing
 * @param {Array<{node: Object, addNewlineBefore: boolean}>} sortedImports - Sorted imports with metadata
 * @param {Object} sourceCode - ESLint source code object
 * @returns {string} Formatted import text
 */
function buildImportText(sortedImports, sourceCode) {
  return sortedImports
    .map(({ node, addNewlineBefore }) => {
      const text = sourceCode.getText(node);
      // Add extra newline before group separators
      // This creates a blank line between groups
      return addNewlineBefore ? '\n' + text : text;
    })
    .join('\n');
}
