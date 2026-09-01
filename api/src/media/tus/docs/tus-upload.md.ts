export const tusUploadDescription = `
For large files (e.g. video) that may be interrupted mid-upload, use this endpoint instead of a plain \`PUT\` to \`upload_url\`. It implements the [TUS resumable upload protocol](https://tus.io/protocols/resumable-upload), letting a client resume an interrupted upload from the last received byte instead of restarting from zero.

**This endpoint is only available for accounts on Cloudflare R2 storage.** Accounts still on the legacy storage backend will receive a \`501\` — use \`POST /v1/media/create-upload-url\` with a plain \`PUT\` for those.

**Example flow using \`tus-js-client\`:**

**Step 1: Get a storage key from the existing upload-url endpoint**

   \`\`\`js
   const response = await fetch('https://api.postforme.dev/v1/media/create-upload-url', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
   });

   const { media_url, key } = await response.json();
   \`\`\`

**Step 2: Start a resumable upload against this endpoint, passing \`key\` back as metadata**

   \`\`\`js
   import { Upload } from 'tus-js-client';

   const upload = new Upload(file, {
     endpoint: 'https://api.postforme.dev/v1/media/tus',
     headers: {
       Authorization: \`Bearer \${apiKey}\`,
     },
     metadata: { key },
     chunkSize: 8 * 1024 * 1024,
     retryDelays: [0, 3000, 5000, 10000, 20000],
     onError: (error) => console.error(error),
     onSuccess: () => {
       // media_url from Step 1 is now valid — use it when creating your post
     },
   });

   upload.start();
   \`\`\`

The \`key\` returned in Step 1 must belong to your project — the server validates this on every request and rejects mismatched or forged keys with a \`403\`.
`;
