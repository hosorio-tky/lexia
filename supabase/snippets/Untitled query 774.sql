DELETE FROM auth.mfa_factors 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hosorio@gmail.com');

Select * FROM auth.mfa_factors;