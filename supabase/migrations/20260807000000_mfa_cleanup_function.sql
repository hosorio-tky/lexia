-- Función para limpiar factores MFA unverified del usuario actual.
-- Usa SECURITY DEFINER + auth.uid() para acceder a auth.mfa_factors de forma segura
-- sin necesidad de exponer el service role key al cliente.
CREATE OR REPLACE FUNCTION public.unenroll_pending_mfa_factors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.mfa_factors
  WHERE user_id = auth.uid()
    AND status = 'unverified';
END;
$$;

-- Solo usuarios autenticados pueden llamar esta función, y solo afecta su propio user_id
REVOKE ALL ON FUNCTION public.unenroll_pending_mfa_factors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unenroll_pending_mfa_factors() TO authenticated;
