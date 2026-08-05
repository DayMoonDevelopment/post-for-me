import type { TypedSupabaseClient } from "~/lib/.server/supabase";

import { fromSupabase } from "~/lib/.server/errors";
import {
  isSystemToProjectType,
  type Project,
  projectTypeToIsSystem,
} from "~/lib/types/project";

import type { ProjectsService } from "./projects.service";

// The columns every read selects, and the row→DTO mapper, kept in one place so
// `list` and `get` can't drift.
const PROJECT_COLUMNS = "id, name, team_id, is_system, auth_callback_url";

type ProjectRow = {
  auth_callback_url: string | null;
  id: string;
  is_system: boolean;
  name: string;
  team_id: string;
};

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    teamId: row.team_id,
    type: isSystemToProjectType(row.is_system),
    callbackUrl: row.auth_callback_url,
  };
}

/**
 * Supabase-backed {@link ProjectsService}.
 *
 * Like teams, RLS scopes the rows to the user's accessible projects. The mapper
 * renames `team_id` → `teamId` and turns the `is_system` flag into the app's
 * `type` discriminator: `is_system` = the shared-credential Quickstart project,
 * everything else is a White Label project. `auth_callback_url` surfaces as
 * `callbackUrl`.
 */
export function createSupabaseProjectsService(
  supabase: TypedSupabaseClient,
): ProjectsService {
  return {
    async list(): Promise<Project[]> {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_COLUMNS)
        .order("name");
      if (error) throw fromSupabase(error);
      return data.map(toProject);
    },

    async get(id): Promise<Project> {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_COLUMNS)
        .eq("id", id)
        .single();
      if (error) throw fromSupabase(error);
      return toProject(data);
    },

    async update(id, patch): Promise<Project> {
      // Build the column patch from only the fields the caller passed, so an
      // absent key leaves that column alone. `callbackUrl: null` is meaningful
      // (clear the URL), so guard on `undefined`, not falsiness.
      const columns: {
        auth_callback_url?: string | null;
        is_system?: boolean;
        name?: string;
      } = {};
      if (patch.name !== undefined) columns.name = patch.name;
      if (patch.type !== undefined) {
        columns.is_system = projectTypeToIsSystem(patch.type);
      }
      if (patch.callbackUrl !== undefined) {
        columns.auth_callback_url = patch.callbackUrl;
      }

      const { data, error } = await supabase
        .from("projects")
        .update(columns)
        .eq("id", id)
        .select(PROJECT_COLUMNS)
        .single();
      if (error) throw fromSupabase(error);
      return toProject(data);
    },

    async remove(id): Promise<void> {
      // RLS rejects the delete if the project isn't in the user's team; the DB
      // cascades to the project's credentials and posts.
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw fromSupabase(error);
    },
  };
}
