import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import * as dotenv from "dotenv";

dotenv.config();
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  build: {
    extensions: [ffmpeg()],
    external: [
      "fluent-ffmpeg",
      "jsdom",
      "sharp",
      "tus-js-client",
      "node-fetch",
      "@supabase/supabase-js",
      "date-fns",
      "@atproto/api",
      "axios",
      "form-data",
      "twitter-api-v2",
      "google-auth-library",
      "googleapis",
      "jsonwebtoken",
      "@unkey/api",
    ],
  },
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["trigger"],
});
