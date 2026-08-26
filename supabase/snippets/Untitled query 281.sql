UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || 
  '{"c2eb9fe2-2cb9-4916-b154-f971b7f6f136": "c2eb9fe2-2cb9-4916-b154-f971b7f6f136", "rol": "admin", "must_change_password": true}'::jsonb
WHERE id = '44ecf8d5-9190-4733-b490-a6a06d51af08';