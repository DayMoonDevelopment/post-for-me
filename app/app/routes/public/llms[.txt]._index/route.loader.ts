const content = `# Post for Me — Dashboard

> Web dashboard for Post for Me, a social media post scheduling and
> publishing API supporting Facebook, Instagram, TikTok, X, YouTube,
> Pinterest, LinkedIn, Threads, and Bluesky.

## Resources

- [Developer API docs](https://api.postforme.dev/docs)
- [Marketing site](https://www.postforme.dev)
`;

export function loader() {
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
