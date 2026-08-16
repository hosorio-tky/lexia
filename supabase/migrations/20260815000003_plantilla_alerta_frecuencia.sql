-- Add frecuencia_dias to plantillas_alerta
-- Controls how often an email alert re-fires within the dias_antes window.
-- 1 = daily, 7 = weekly, etc. Only relevant for canal = 'email'.

ALTER TABLE plantillas_alerta
  ADD COLUMN IF NOT EXISTS frecuencia_dias INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN plantillas_alerta.frecuencia_dias IS
  'Email repeat interval in days within the dias_antes window. 1 = daily, 7 = weekly.';
