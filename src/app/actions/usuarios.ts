"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession, requireRole } from "@/lib/auth/session";
import { sendInvitacion } from "@/lib/email/send";
import type { UserRole } from "@/types/users";

// ─── Invitar usuario al tenant ────────────────────────────────
export async function invitarUsuario(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean; email?: string }> {
  const session = await getSession();
  requireRole(session, ["admin", "supervisor"]);

  const email    = formData.get("email") as string;
  const nombre   = formData.get("nombre") as string;
  const apellido = (formData.get("apellido") as string) || undefined;
  const rol      = (formData.get("rol") as UserRole) ?? "usuario";
  const cargo    = (formData.get("cargo") as string) || undefined;

  if (!email || !nombre) return { error: "Email y nombre son obligatorios" };

  const admin  = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Invitar usuario — Supabase crea la cuenta Y envía el email (→ Mailpit en local)
  const { data: userData, error: createError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data:       { nombre },
      redirectTo: `${appUrl}/auth/callback?next=/actualizar-contrasena`,
    }
  );

  if (createError) {
    if (createError.message.includes("already registered")) {
      return { error: "Este correo ya tiene una cuenta en el sistema" };
    }
    return { error: createError.message };
  }

  if (!userData.user) return { error: "No se pudo crear el usuario." };

  // Insertar/actualizar profile con tenant_id y rol
  await admin.from("profiles").upsert({
    id:          userData.user.id,
    tenant_id:   session.tenant_id,
    nombre,
    apellido:    apellido ?? null,
    cargo:       cargo ?? null,
    email,
    rol,
    invited_by:  session.user_id,
  });

  // Actualizar app_metadata para las RLS helpers
  await admin.auth.admin.updateUserById(userData.user.id, {
    app_metadata: { tenant_id: session.tenant_id, rol },
  });

  // Log de actividad
  const repo = createUsuariosRepository(admin, session.tenant_id);
  await repo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "invitar_usuario",
    modulo:       "usuarios",
    recurso_id:   userData.user?.id,
    recurso_desc: `Invitó a ${nombre} (${email}) con rol ${rol}`,
  });

  revalidatePath("/usuarios");
  return { success: true, email };
}

// ─── Reenviar invitación a usuario existente ──────────────────
export async function reenviarInvitacion(
  userId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const admin = createAdminClient();

  // Obtener email del profile
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email, nombre")
    .eq("id", userId)
    .eq("tenant_id", session.tenant_id)
    .single();

  if (profileError || !profile?.email) {
    return { error: "Usuario no encontrado" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Generar link (funciona siempre, sin importar si el email está confirmado)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type:    "recovery",
    email:   profile.email,
    options: { redirectTo: `${appUrl}/auth/confirm` },
  });

  if (linkError) {
    console.error("[reenviarInvitacion] generateLink error:", linkError.message);
    return { error: `No se pudo generar el enlace: ${linkError.message}` };
  }

  let actionLink = linkData?.properties?.action_link;
  console.log("[reenviarInvitacion] actionLink raw:", actionLink ?? "null");

  // El SDK devuelve /verify en lugar de /auth/v1/verify — Kong requiere el prefijo
  if (actionLink?.includes("/verify?") && !actionLink.includes("/auth/v1/verify")) {
    actionLink = actionLink.replace("/verify?", "/auth/v1/verify?");
  }
  console.log("[reenviarInvitacion] actionLink fixed:", actionLink ?? "null");

  if (actionLink) {
    await sendInvitacion(profile.email, {
      destinatarioNombre: profile.nombre,
      actionLink,
      invitadoPorNombre:  session.nombre_completo || session.nombre,
    });
  } else {
    return { error: "No se pudo generar el enlace de activación" };
  }

  const repo = createUsuariosRepository(admin, session.tenant_id);
  await repo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "reenviar_invitacion",
    modulo:       "usuarios",
    recurso_id:   userId,
    recurso_desc: `Reenvió invitación a ${profile.email}`,
  });

  revalidatePath(`/usuarios/${userId}`);
  return { success: true };
}

/**
 * Envía un email de activación/recuperación de contraseña vía Supabase Auth.
 * Localmente el email llega a Mailpit. En producción usa el SMTP configurado.
 */
async function enviarEmailActivacion(email: string): Promise<void> {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseAnon,
    },
    body: JSON.stringify({
      email,
      gotrue_meta_security: {},
      redirect_to: `${appUrl}/auth/confirm`,
    }),
  });
}

// ─── Editar usuario (rol, nombre, activo) ────────────────────
export async function editarUsuario(
  id: string,
  formData: FormData
): Promise<void> {
  const session = await getSession();
  // Puede editarse a sí mismo o (admin) a cualquiera del tenant
  const isSelf = session.user_id === id;
  if (!isSelf) requireRole(session, ["admin"]);

  const admin = createAdminClient();
  const repo  = createUsuariosRepository(admin, session.tenant_id);

  const input: Parameters<typeof repo.update>[1] = {
    nombre:       formData.get("nombre") as string,
    apellido:     (formData.get("apellido") as string) || undefined,
    cargo:        (formData.get("cargo") as string) || undefined,
    departamento: (formData.get("departamento") as string) || undefined,
    telefono:     (formData.get("telefono") as string) || undefined,
  };

  // Solo admin puede cambiar el rol de otros
  if (!isSelf && session.rol === "admin") {
    const rol = formData.get("rol") as UserRole;
    if (rol) input.rol = rol;
  }

  await repo.update(id, input);

  await repo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       isSelf ? "editar_perfil" : "editar_usuario",
    modulo:       "usuarios",
    recurso_id:   id,
    recurso_desc: `Actualizó perfil de usuario`,
  });

  revalidatePath(`/usuarios/${id}`);
  revalidatePath("/usuarios");
  revalidatePath("/perfil");
  redirect(isSelf ? "/perfil" : `/usuarios/${id}`);
}

// ─── Desactivar / activar usuario ────────────────────────────
export async function toggleActivoUsuario(
  id: string,
  activo: boolean
): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  if (id === session.user_id) {
    throw new Error("No puedes desactivarte a ti mismo");
  }

  const admin = createAdminClient();
  const repo  = createUsuariosRepository(admin, session.tenant_id);

  await repo.update(id, { activo });

  await repo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       activo ? "activar_usuario" : "desactivar_usuario",
    modulo:       "usuarios",
    recurso_id:   id,
  });

  revalidatePath(`/usuarios/${id}`);
  revalidatePath("/usuarios");
}

// ─── Actualizar contraseña desde perfil ──────────────────────
export async function cambiarContrasena(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  await getSession(); // verifica auth

  const nueva   = formData.get("nueva") as string;
  const confirma = formData.get("confirma") as string;

  if (!nueva || nueva.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (nueva !== confirma) {
    return { error: "Las contraseñas no coinciden" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  return { success: true };
}
