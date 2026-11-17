import { AtpAgent } from "@atproto/api";
import type { AtpSessionData, BlobRef } from "@atproto/api";
import { task } from "@trigger.dev/sdk";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

type Auth = { service: string; session: AtpSessionData };

function createAgent({ service, session }: Auth): AtpAgent {
  const agent = new AtpAgent({ service });
  // resumeSession performs getSession and can refresh; reuse the parent's live session.
  agent.sessionManager.session = session;
  return agent;
}

export const uploadBlueskyImage = task({
  id: "upload-bluesky-image",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ url, encoding, ...auth }: Auth & { url: string; encoding: string }): Promise<BlobRef> => {
    const response = await globalThis.fetch(url);
    const file = await response.blob();
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await createAgent(auth).uploadBlob(buffer, { encoding });
    return result.data.blob;
  },
});

export const uploadBlueskyLinkPreview = task({
  id: "upload-bluesky-link-preview",
  machine: "medium-1x",
  retry: { maxAttempts: 2, outOfMemory: { machine: "large-1x" } },
  run: async ({ url, ...auth }: Auth & { url: string }): Promise<{
    $type: string;
    external: { uri: string; title: string | null; description: string | null; thumb?: BlobRef };
  } | null> => {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const card: { uri: string; title: string | null; description: string | null; thumb?: BlobRef } = {
        uri: url, title: "", description: "",
      };
      const titleTag = document.querySelector('meta[property="og:title"]');
      const descriptionTag = document.querySelector('meta[property="og:description"]');
      const imageTag = document.querySelector('meta[property="og:image"]');
      card.title = titleTag ? titleTag.getAttribute("content") : document.querySelector("title")?.textContent || "";
      if (descriptionTag) {
        card.description = descriptionTag.getAttribute("content");
      } else {
        const metaDesc = document.querySelector('meta[name="description"]');
        card.description = metaDesc ? metaDesc.getAttribute("content") : "";
      }
      if (imageTag) {
        let imageUrl = imageTag.getAttribute("content") || "";
        if (!imageUrl.startsWith("http")) {
          const urlObj = new URL(url);
          imageUrl = imageUrl.startsWith("/")
            ? `${urlObj.protocol}//${urlObj.host}${imageUrl}`
            : `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
        }
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const { data: uploadData } = await createAgent(auth).uploadBlob(new Uint8Array(imageBuffer), {
          encoding: imageResponse.headers.get("content-type") || "image/jpeg",
        });
        if (uploadData?.blob) card.thumb = uploadData.blob;
      }
      return { $type: "app.bsky.embed.external", external: card };
    } catch (error) {
      console.error("Error creating embed card:", error);
      return null;
    }
  },
});
