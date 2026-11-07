-- Tabla de turnos de PRANA (esquema base, ya aplicado en el proyecto prana-turnos).
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fecha date not null,
  hora time not null,
  servicio text not null check (char_length(servicio) between 1 and 500),
  precio integer not null check (precio > 0),
  nombre text not null check (char_length(nombre) between 1 and 60),
  apellido text not null check (char_length(apellido) between 1 and 60),
  edad smallint not null check (edad between 1 and 99),
  telefono text not null check (telefono ~ '^[0-9]{8,15}$'),
  comentarios text check (char_length(comentarios) <= 300),
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmado','cancelado','ausente')),
  -- solo jueves, turnos en punto de 09:00 a 17:00
  constraint solo_jueves check (extract(isodow from fecha) = 4),
  constraint horario_valido check (
    hora between time '09:00' and time '17:00' and extract(minute from hora) = 0
  )
);

-- un horario solo puede tener un turno activo (los cancelados liberan el lugar)
create unique index turnos_horario_unico
  on public.turnos (fecha, hora) where estado <> 'cancelado';

alter table public.turnos enable row level security;

-- el público ve qué horas están ocupadas, sin ningún dato personal
create or replace function public.horarios_ocupados(p_fecha date)
returns table (hora time)
language sql stable security definer
set search_path = public
as $$
  select t.hora from public.turnos t
  where t.fecha = p_fecha and t.estado <> 'cancelado';
$$;
revoke all on function public.horarios_ocupados(date) from public;
grant execute on function public.horarios_ocupados(date) to anon, authenticated;
