-- contrato_plantillas.tipo era un enum fijo (contrato_tipo, 6 valores) pero el
-- formulario "Nueva Plantilla" siempre ofreció el catálogo dinámico de tenant
-- (tipo_contrato), causando "invalid input value for enum" al elegir cualquier
-- valor del catálogo que no coincidiera exactamente con el enum.
-- Se alinea con contratos.tipo_id -> catalogos: aquí se guarda como texto libre
-- (igual que ya se compara en usar-plantilla-modal.tsx / contrato-extractor.ts).
ALTER TABLE contrato_plantillas ALTER COLUMN tipo TYPE text USING tipo::text;
DROP TYPE contrato_tipo;
