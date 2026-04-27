"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession, requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/types/users";

// ─── Invitar usuario al tenant ────────────────────────────────
export async function invitarUsuario(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; inviteLink?: string }> {
  const session = await getSession();
  requireRole(session, ["admin", "supervisor"]);

  const email    = formData.get("email") as string;
  const nombre   = formData.get("nombre") as string;
  const apellido = (formData.get("apellido") as string) || undefined;
  const rol      = (formData.get("rol") as UserRole) ?? "usuario";
  const cargo    = (formData.get("cargo") as string) || undefined;

  if (!email || !nombre) return { error: "Email y nombre son obligatorios" };

  const admin = createAdminClient();

  // Crear usuario auth (sin app_metadata, lo gestionamos manualmente)
  const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (createError) {
    if (createError.message.includes("already registered")) {
      return { error: "Este correo ya tiene una cuenta en el sistema" };
    }
    return { error: createError.message };
  }

  if (!userData.user) return { error: "No se pudo crear el usuario." };

  // Insertar/actualizar profile manualmente con tenant_id y rol correctos
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

  // Generar link de activación (para que el usuario pueda establecer su contraseña)
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
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

  const inviteLink = linkData?.properties?.action_link ?? undefined;
  return { inviteLink };
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
