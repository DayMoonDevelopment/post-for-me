 
import "./code-block-prism";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-bash";
 

/**
 * Registers Prism grammars that prism-react-renderer's default bundle omits but
 * the code panel needs: Ruby (SDK) and Bash (for the cURL sample). TypeScript,
 * Python, and Go are already in the bundle. Importing this module for its side
 * effect makes those grammars available to every {@link ./code-block CodeBlock}.
 */
export {};
