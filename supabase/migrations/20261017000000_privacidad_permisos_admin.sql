-- 1) Permisos mínimos: antes anon/authenticated tenían todos los permisos
--    (incluido TRUNCATE, que RLS no controla). Ahora solo lo necesario.
revoke all on public.turnos from anon, authenticated;
grant insert on public.turnos to anon, authenticated;
grant select, delete on public.turnos to authenticated;
grant update (estado) on public.turnos to authenticated;

-- 2) Consentimiento: no se acepta una reserva sin aceptar el aviso de privacidad.
--    La fecha y hora del consentimiento es created_at.
alter table public.turnos
  add column if not exists acepta_privacidad boolean not null default false;

drop policy if exists "reservar turno" on public.turnos;
create policy "reservar turno" on public.turnos
  for insert to anon, authenticated
  with check (estado = 'pendiente' and fecha > current_date and acepta_privacidad is true);

-- 3) Administración: solo los usuarios de la lista `admins` (no cualquier usuario registrado).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

drop policy if exists "admin ve turnos" on public.turnos;
create policy "admin ve turnos" on public.turnos
  for select to authenticated using (public.es_admin());

drop policy if exists "admin actualiza estado" on public.turnos;
create policy "admin actualiza estado" on public.turnos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admin elimina turnos" on public.turnos;
create policy "admin elimina turnos" on public.turnos
  for delete to authenticated using (public.es_admin());

-- Supabase otorga EXECUTE a anon por defecto: se lo quitamos a es_admin() (solo la usan usuarios autenticados).
revoke execute on function public.es_admin() from anon;
