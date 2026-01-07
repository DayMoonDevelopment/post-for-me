import type { User } from "@supabase/supabase-js";
import { LoopsClient } from "loops";

import { LOOPS_API_KEY } from "~/lib/.server/loops.constants";

export const loops = LOOPS_API_KEY ? new LoopsClient(LOOPS_API_KEY) : null;

export async function syncUserToLoops(user: User) {
  if (!loops || !user.email) {
    return;
  }

  try {
    await loops.updateContact(user.email, {
      email: user.email,
      firstName: user.user_metadata?.first_name,
      lastName: user.user_metadata?.last_name,
      userId: user.id,
      createdAt: user.created_at,
      lastLoginAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to sync user to Loops:", error);
  }
}
