import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../supabase';

export interface SeededTestContext {
  userIds: Record<
    'user1' | 'user2' | 'user3' | 'user4' | 'user5' | 'caleb',
    string
  >;
  teamId: string;
  projectId: string;
  facebookConnectionId: string;
}

function serviceRoleClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_KEY must be set (from .env.local) to run e2e tests against local Supabase.',
    );
  }

  return createClient<Database>(url, serviceKey);
}

export async function getSeededTestContext(): Promise<SeededTestContext> {
  const client = serviceRoleClient();

  const emails = [
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
    'user4@example.com',
    'user5@example.com',
    'caleb@daymoon.dev',
  ];

  const { data: users, error: usersError } = await client
    .from('users')
    .select('id, email')
    .in('email', emails);

  if (usersError || !users || users.length !== emails.length) {
    throw new Error(
      `Seeded users not found — did you run "bun run supabase:reset"? ${
        usersError?.message ?? ''
      }`,
    );
  }

  const { data: project, error: projectError } = await client
    .from('projects')
    .select('id, team_id')
    .eq('name', 'Example Project')
    .single();

  if (projectError || !project) {
    throw new Error(
      'Seeded "Example Project" not found — run "bun run supabase:reset".',
    );
  }

  const { data: fbConnection, error: fbError } = await client
    .from('social_provider_connections')
    .select('id')
    .eq('project_id', project.id)
    .eq('provider', 'facebook')
    .limit(1)
    .single();

  if (fbError || !fbConnection) {
    throw new Error(
      'Seeded facebook connection not found — run "bun run supabase:reset".',
    );
  }

  const byEmail = (email: string) => users.find((u) => u.email === email)!.id;

  return {
    userIds: {
      user1: byEmail('user1@example.com'),
      user2: byEmail('user2@example.com'),
      user3: byEmail('user3@example.com'),
      user4: byEmail('user4@example.com'),
      user5: byEmail('user5@example.com'),
      caleb: byEmail('caleb@daymoon.dev'),
    },
    teamId: project.team_id,
    projectId: project.id,
    facebookConnectionId: fbConnection.id,
  };
}
