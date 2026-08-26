SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('v_permisos', 'v_profiles', 'v_contratos');