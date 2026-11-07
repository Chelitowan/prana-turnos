-- NO se aplica solo (la extensión .EJEMPLO.sql evita que el CLI la tome).
-- Pasos: 1) crear el usuario en Supabase > Authentication > Users (con email y contraseña).
--        2) ejecutar esto en el SQL Editor, reemplazando el email por el de PRANA.
insert into public.admins (user_id)
select id from auth.users where email = 'REEMPLAZAR@email.com';
