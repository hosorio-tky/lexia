-- ============================================================
-- MFA opcional por usuario.
--
-- Hasta ahora el MFA era obligatorio para todos: el layout del
-- dashboard forzaba /mfa/setup o /mfa/challenge sin excepción. Esto
-- generaba fricción en onboarding (ej. invitar a un usuario externo
-- que solo necesita acceso puntual). Se agrega un flag por usuario,
-- controlable solo por un admin, para exigir o no MFA en esa cuenta.
--
-- Default true: ningún usuario existente cambia de comportamiento.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN mfa_required boolean NOT NULL DEFAULT true;
