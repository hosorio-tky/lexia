"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ──────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 50);
}

// ─── Registro (crea nuevo tenant + primer admin) ──────────────
export async function registrar(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nombre   = formData.get("nombre") as string;
  const empresa  = formData.get("empresa") as string;

  if (!email || !password || !nombre || !empresa) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const admin = createAdminClient();

  // 1. Crear tenant
  const slug = slugify(empresa) || `tenant-${Date.now()}`;
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ nombre: empresa, slug })
    .select("id")
    .single();

  if (tenantError) {
    if (tenantError.code === "23505") {
      return { error: "Ya existe una empresa con ese nombre. Usa un nombre diferente." };
    }
    return { error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  // 2. Crear usuario en Supabase Auth
  // Nota: el trigger handle_new_user puede no recibir app_metadata en el INSERT
  // inicial (GoTrue lo aplica en un UPDATE posterior), por eso insertamos el
  // profile manualmente en el paso 3.
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (authError) {
    // Rollback del tenant
    await admin.from("tenants").delete().eq("id", tenant.id);
    if (authError.message.includes("already registered")) {
      return { error: "Este correo ya tiene una cuenta. Inicia sesión." };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    return { error: "No se pudo crear el usuario. Intenta de nuevo." };
  }

  // 3. Insertar profile manualmente (garantiza tenant_id y rol correctos)
  const { error: profileError } = await admin.from("profiles").upsert({
    id:        authData.user.id,
    tenant_id: tenant.id,
    nombre,
    email,
    rol:       "admin",
  });

  if (profileError) {
    // Rollback
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("tenants").delete().eq("id", tenant.id);
    return { error: "Error al configurar el perfil. Intenta de nuevo." };
  }

  // 4. Actualizar app_metadata para que las RLS helpers funcionen correctamente
  await admin.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { tenant_id: tenant.id, rol: "admin" },
  });

  // 5. Log de actividad
  await admin.from("user_activity_log").insert({
    tenant_id:    tenant.id,
    user_id:      authData.user.id,
    user_nombre:  nombre,
    accion:       "registro",
    modulo:       "auth",
    recurso_desc: `Nueva cuenta: ${empresa}`,
  });

  // 4. Iniciar sesión automáticamente
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // El usuario fue creado pero no se pudo iniciar sesión — redirigir a login
    redirect("/login?registered=1");
  }

  redirect("/permisos");
}

// ─── Iniciar sesión ───────────────────────────────────────────
export async function signIn(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos" };
  }

  // Log de actividad
  if (data.user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id, nombre")
      .eq("id", data.user.id)
      .single();

    if (profile) {
      await admin.from("user_activity_log").insert({
        tenant_id:   profile.tenant_id,
        user_id:     data.user.id,
        user_nombre: profile.nombre,
        accion:      "login",
        modulo:      "auth",
      });
      // Actualizar último acceso
      await admin
        .from("profiles")
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq("id", data.user.id);
    }
  }

  redirect("/permisos");
}

// ─── Cerrar sesión ────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─── Solicitar recuperación de contraseña ────────────────────
export async function solicitarRecuperacion(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get("email") as string;
  if (!email) return { error: "El correo es obligatorio" };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/actualizar-contrasena`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Actualizar contraseña (desde link de recuperación) ───────
export async function actualizarContrasena(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const password = formData.get("password") as string;
  const confirm  = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: true };
}
