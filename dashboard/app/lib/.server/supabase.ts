import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from "./supabase.constants";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { Database } from "@post-for-me/db";

export interface SupabaseContext {
  supabase: SupabaseClientType<Database>;
  supabaseServiceRole: SupabaseClientType<Database>;
}

function _createSupabaseClientFromRequest(
  request: Request
): [SupabaseClientType<Database>, Headers] {
  const headers = new Headers();

  return [
    createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        async getAll() {
          const cookies = parseCookieHeader(
            request.headers.get("Cookie") ?? ""
          );
          return cookies.map(({ name, value }) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            )
          );
        },
      },
    }) as unknown as SupabaseClientType<Database>,
    headers,
  ];
}

function _createSupabaseServiceRoleClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Creates a `loader` or `action` function that automatically injects the Supabase client.
 *
 * @example Inline definition of a loader function
 * const loader = withSupabase(async function({ supabase }) {
 *     const { data } = await supabase.from("users").select("*");
 *     return data;
 * });
 *
 * @example Using a named action function
 * function myAction({ supabase }) { ... }
 *
 * export const action = withSupabase(myAction);
 *
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function withSupabase<
  THandler extends (
    args: (LoaderFunctionArgs | ActionFunctionArgs) & SupabaseContext
  ) => any,
>(
  handler: THandler
): THandler extends (args: any) => infer R
  ? (args: LoaderFunctionArgs | ActionFunctionArgs) => R
  : never {
  return async function (args: LoaderFunctionArgs | ActionFunctionArgs) {
    const [supabase, headers] = _createSupabaseClientFromRequest(args.request);
    const supabaseServiceRole = _createSupabaseServiceRoleClient();

    const res = await handler({ ...args, supabase, supabaseServiceRole });

    if (res instanceof Response) {
      headers.forEach((value, key) => {
        res.headers.append(key, value);
      });
    } else if ((res as { type: string })?.type === "DataWithResponseInit") {
      (res as { init: { headers: unknown } }).init = { headers };
    }

    if (args.request.method !== "GET" && !res) {
      throw new Error("Action must return a response");
    }

    return res;
  } as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
