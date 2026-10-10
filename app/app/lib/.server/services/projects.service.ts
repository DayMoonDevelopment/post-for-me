import type { Project, ProjectType } from "~/lib/types/project";

/** Fields a caller may change on a project. Omitted keys are left untouched;
 * `callbackUrl: null` explicitly clears the URL. */
export interface ProjectUpdate {
  callbackUrl?: string | null;
  name?: string;
  type?: ProjectType;
}

/** Fields required to create a new project. */
export interface ProjectCreate {
  name: string;
  teamId: string;
  type: ProjectType;
}

/** Reads and configures the projects the current user can access. Returns
 * `Project` DTOs. */
export interface ProjectsService {
  /** Insert a new project under a team (RLS requires the caller be a team
   * member). Returns the created `Project`. */
  create(input: ProjectCreate): Promise<Project>;
  /** A single project by id (RLS-scoped). Throws if not found/accessible. */
  get(id: string): Promise<Project>;
  list(): Promise<Project[]>;
  /** Permanently delete a project (RLS-scoped). Cascades to its credentials and
   * posts at the database level. */
  remove(id: string): Promise<void>;
  /** Patch a project's configurable fields (name, credential model, callback
   * URL). Returns the updated `Project`. */
  update(id: string, patch: ProjectUpdate): Promise<Project>;
}
