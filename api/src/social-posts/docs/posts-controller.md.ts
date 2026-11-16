export const postsControllerDescription = `
Posts represent content that can be published across multiple social media platforms. Each post can have platform-specific content variations, allowing customization for different platforms and accounts. Content can be defined at three levels:

1. Default content for all platforms
2. Platform-specific content overrides
3. Account-specific content overrides

The system will use the most specific content override available when publishing to each platform and account.
`;
