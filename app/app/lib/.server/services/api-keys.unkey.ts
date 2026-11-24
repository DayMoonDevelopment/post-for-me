import type { Unkey } from "@unkey/api";

import type { ApiKey, ApiKeyCreator } from "~/lib/types/api-key";

import {
  LIVE_KEY_PREFIX,
  requireUnkey,
  TEMPORARY_KEY_NAME,
  TEMPORARY_KEY_PREFIX,
} from "~/lib/.server/api/unkey";
import { AppException, NotFoundException, UpstreamException } from "~/lib/.server/errors";

import type {
  ApiKeysService,
  CreateApiKeyInput,
  DeleteApiKeyInput,
  RenameApiKeyInput,
} from "./api-keys.service";

/** A key's metadata as we write it. `created_by` (user id) + `team_id` +
 * `plan_*` mirror what the API's auth layer reads off a key; `created_by_label`
 * is our display-only snapshot (name/email at creation). */
interface KeyMeta {
  created_by?: unknown;
  created_by_label?: unknown;
}

/** Normalize an Unkey SDK failure into an `AppException` (an existing one passes
 * through). Their API failing us is `upstream`; the original survives as
 * `cause`. */
function fromUnkey(error: unknown): AppException {
  if (AppException.isAppException(error)) return error;
  return new UpstreamException(undefined, {
    message: error instanceof Error ? error.message : "Unkey request failed",
    cause: error,
    context: { provider: "unkey" },
  });
}

/**
 * Guard that a key belongs to this project before mutating it. Keys are scoped
 * by `externalId = projectId`; `list`/`create` already respect that, but
 * `rename`/`delete` take a raw keyId from the client, so re-check here (a member
 * of project A must not touch project B's key by id). A mismatch reads as
 * not-found — we don't confirm the existence of keys outside the project.
 */
async function assertKeyInProject(
  unkey: Unkey,
  id: string,
  projectId: string,
): Promise<void> {
  const response = await unkey.keys.getKey({ keyId: id });
  const externalId = response.data.identity?.externalId;
  if (externalId !== projectId) {
    throw new NotFoundException(undefined, {
      message: `API key ${id} is not in project ${projectId} (externalId=${externalId ?? "none"})`,
      context: { keyId: id, projectId },
    });
  }
}

function extractCreator(meta: KeyMeta | null | undefined): ApiKeyCreator | null {
  const id = meta?.created_by;
  if (typeof id !== "string") return null;
  return {
    id,
    label: typeof meta?.created_by_label === "string" ? meta.created_by_label : null,
  };
}

/** Temp keys ({@link TEMPORARY_KEY_PREFIX}) share the namespace but are internal
 * dashboard credentials — never show them as the user's own keys. */
function isTemporaryKey(row: { name?: null | string; start: string }): boolean {
  return row.start.startsWith(TEMPORARY_KEY_PREFIX) || row.name === TEMPORARY_KEY_NAME;
}

function toApiKey(row: {
  createdAt: number;
  keyId: string;
  meta?: null | Record<string, unknown>;
  name?: null | string;
  start: string;
}): ApiKey {
  return {
    id: row.keyId,
    name: row.name ?? null,
    reference: row.start,
    createdAt: new Date(row.createdAt).toISOString(),
    createdBy: extractCreator(row.meta as KeyMeta | null),
  };
}

/**
 * Unkey-backed {@link ApiKeysService} for the user's OWN long-lived keys
 * (`pfm_live`). The only code that knows Unkey's vocabulary — it maps our domain
 * onto Unkey's v2 API (`externalId ← projectId`, native `name`, `meta.*`,
 * `start → reference`, `keyId → id`). Temporary dashboard keys (`pfm_tmp`) live
 * in the same namespace and are filtered out of `list`.
 */
export function createUnkeyApiKeysService(): ApiKeysService {
  return {
    async list(projectId): Promise<ApiKey[]> {
      const { unkey, apiId } = requireUnkey();
      try {
        const keys: ApiKey[] = [];
        const iterator = await unkey.apis.listKeys({
          apiId,
          externalId: projectId,
          limit: 100,
        });
        for await (const page of iterator) {
          for (const row of page.result.data) {
            if (isTemporaryKey(row)) continue;
            keys.push(toApiKey(row));
          }
        }
        return keys.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      } catch (error) {
        throw fromUnkey(error);
      }
    },

    async create({
      projectId,
      name,
      createdBy,
      teamId,
      planMeta,
    }: CreateApiKeyInput): Promise<{ apiKey: ApiKey; secret: string }> {
      const { unkey, apiId } = requireUnkey();
      try {
        const response = await unkey.keys.createKey({
          apiId,
          prefix: LIVE_KEY_PREFIX,
          externalId: projectId,
          name,
          meta: {
            team_id: teamId,
            created_by: createdBy.id,
            created_by_label: createdBy.label,
            ...planMeta,
          },
          enabled: true,
          recoverable: false,
        });
        const { keyId, key } = response.data;
        const apiKey: ApiKey = {
          id: keyId,
          name: name ?? null,
          reference: key.slice(0, 12),
          createdAt: new Date().toISOString(),
          createdBy,
        };
        return { apiKey, secret: key };
      } catch (error) {
        throw fromUnkey(error);
      }
    },

    async rename({ id, name, projectId }: RenameApiKeyInput): Promise<void> {
      const { unkey } = requireUnkey();
      try {
        await assertKeyInProject(unkey, id, projectId);
        await unkey.keys.updateKey({ keyId: id, name });
      } catch (error) {
        throw fromUnkey(error);
      }
    },

    async delete({ id, projectId }: DeleteApiKeyInput): Promise<void> {
      const { unkey } = requireUnkey();
      try {
        await assertKeyInProject(unkey, id, projectId);
        await unkey.keys.deleteKey({ keyId: id });
      } catch (error) {
        throw fromUnkey(error);
      }
    },
  };
}
