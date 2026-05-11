/**
 * Custom ESLint rule to enforce alias imports over relative parent imports
 * Converts ../ui/button → ~/ui/button
 * Allows same-directory imports like ./component
 */

const ALIAS_DIRS = ["ui", "components", "lib", "hooks", "providers", "routes"];

// Route name patterns that indicate cross-route imports
const ROUTE_PATTERNS = ["_root", "_resource", "resources"];

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce the use of alias imports (~/...) instead of relative parent imports (../...)",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    messages: {
      useAlias:
        "Use alias import '~/{{dir}}/{{path}}' instead of relative parent import",
    },
    schema: [],
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const sourceFile = context.filename;

        // Skip if not a relative import or doesn't go up directories
        if (!importPath.startsWith("../")) {
          return;
        }

        const segments = importPath.split("/");
        const firstNonDotSegment = segments.find(
          (seg) => seg !== ".." && seg !== "."
        );

        if (!firstNonDotSegment) {
          return;
        }

        // Check for cross-route imports first (e.g., ../../_root._index/...)
        // These should use ~/routes/[route-name]/...
        const isCrossRouteImport =
          sourceFile.includes("/routes/") &&
          ROUTE_PATTERNS.some(pattern =>
            firstNonDotSegment === pattern || firstNonDotSegment.startsWith(pattern)
          );

        if (isCrossRouteImport) {
          const aliasDirIndex = segments.indexOf(firstNonDotSegment);
          const remainingPath = segments.slice(aliasDirIndex).join("/");
          const newImportPath = `~/routes/${remainingPath}`;

          reportAliasViolation(context, node, "routes", remainingPath, newImportPath);
          return;
        }

        // Check if any segment matches our standard alias directories
        const aliasInfo = findAliasDirectory(segments);

        if (!aliasInfo) {
          return;
        }

        const { aliasDir, aliasDirIndex } = aliasInfo;
        const remainingPath = segments.slice(aliasDirIndex + 1).join("/");
        const newImportPath = `~/${aliasDir}${remainingPath ? "/" + remainingPath : ""}`;

        reportAliasViolation(context, node, aliasDir, remainingPath, newImportPath);
      },
    };
  },
};

/**
 * Find the first alias directory in the import path segments
 * @param {string[]} segments - Path segments split by "/"
 * @returns {{aliasDir: string, aliasDirIndex: number} | null}
 */
function findAliasDirectory(segments) {
  for (let i = 0; i < segments.length; i++) {
    if (ALIAS_DIRS.includes(segments[i])) {
      return {
        aliasDir: segments[i],
        aliasDirIndex: i,
      };
    }
  }
  return null;
}

/**
 * Report an alias import violation and provide auto-fix
 * @param {Object} context - ESLint context
 * @param {Object} node - Import declaration node
 * @param {string} aliasDir - The alias directory (e.g., "ui", "routes")
 * @param {string} remainingPath - Path after the alias directory
 * @param {string} newImportPath - The corrected import path
 */
function reportAliasViolation(context, node, aliasDir, remainingPath, newImportPath) {
  context.report({
    node: node.source,
    messageId: "useAlias",
    data: {
      dir: aliasDir,
      path: remainingPath,
    },
    fix(fixer) {
      const quote = node.source.raw[0];
      return fixer.replaceText(node.source, `${quote}${newImportPath}${quote}`);
    },
  });
}
