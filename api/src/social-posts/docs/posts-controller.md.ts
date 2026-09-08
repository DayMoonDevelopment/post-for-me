export const postsControllerDescription = `
Posts represent content that can be published across multiple social media platforms. Each post can have platform-specific content variations, allowing customization for different platforms and accounts. Content can be defined at three levels:

1. Default content for all platforms
2. Platform-specific content overrides
3. Account-specific content overrides

The system will use the most specific content override available when publishing to each platform and account.

Posts can optionally include a \`chain\`: an ordered list of follow-up posts published as sequential replies after the root post (item 1 replies to the root, item 2 replies to item 1, and so on), forming a thread. Chains are only supported on x, threads, and bluesky - other platforms in the same request publish only the root post and ignore the chain.
`;
