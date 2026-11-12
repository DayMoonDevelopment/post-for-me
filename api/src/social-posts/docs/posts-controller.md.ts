export const postsControllerDescription = `
Posts represent content that can be published across multiple social media platforms. Each post can have platform-specific content variations, allowing customization for different platforms and accounts. Content can be defined at three levels:

1. Default content for all platforms
2. Platform-specific content overrides
3. Account-specific content overrides

The system will use the most specific content override available when publishing to each platform and account.

### Reply to an existing X post

Set the optional string \`platform_configurations.x.reply_to_tweet_id\` to the known X post ID you want to reply to. For example, send this body to \`POST /v1/social-posts\`, replacing the account ID with your connected X account:

\`\`\`json
{
  "caption": "Thanks for the update!",
  "social_accounts": ["your-connected-x-account-id"],
  "platform_configurations": {
    "x": {
      "reply_to_tweet_id": "1841234567890123456"
    }
  }
}
\`\`\`

The publisher sends this ID to X as \`reply.in_reply_to_tweet_id\`. Omit \`reply_to_tweet_id\` to keep existing publishing behavior. This is separate from \`reply_settings\`, which controls who can reply to your post. This parameter creates a single reply; it does not orchestrate threads or retrieve comments.
`;
