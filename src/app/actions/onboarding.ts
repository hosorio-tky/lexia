"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, requireRole } from "@/lib/auth/session";

export async function toggleOnboardingStep(
  stepId: string,
  completed: boolean
): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  const { data } = await client
    .from("tenants")
    .select("onboarding_steps")
    .eq("id", session.tenant_id)
    .single();

  const steps = (data?.onboarding_steps as Record<string, boolean>) ?? {};
  steps[stepId] = completed;

  await client
    .from("tenants")
    .update({ onboarding_steps: steps })
    .eq("id", session.tenant_id);

  revalidatePath("/dashboard");
}

export async function dismissOnboarding(): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  await client
    .from("tenants")
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq("id", session.tenant_id);

  revalidatePath("/dashboard");
}
