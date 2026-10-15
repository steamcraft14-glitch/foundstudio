-- {found} studio · formulario en línea «Lo que te solicitamos» (/brief/) guardado para el panel
-- Pegar completo en Supabase → SQL Editor → Run, DESPUÉS de 20261014000000_portal.sql. Se puede correr más de una vez.
--
-- Quién ve qué:
--   · visitante anónimo: solo puede AGREGAR un formulario; nunca leerlo ni cambiarlo.
--   · administrador: lo ve todo, lo marca como revisado o archivado y lo pasa a cotización.

create table if not exists public.formularios (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nombre text not null check (length(nombre) between 1 and 80),
  negocio text not null check (length(negocio) between 1 and 80),
  telefono text check (length(telefono) <= 30),
  email text check (length(email) <= 120),
  proyecto text check (length(proyecto) <= 30),
  -- las respuestas tal como las arma /brief/: { "Nombre de la pregunta": "texto" | ["opción", …] }
  respuestas jsonb not null default '{}' check (jsonb_typeof(respuestas) = 'object' and pg_column_size(respuestas) < 60000),
  consentimiento text not null check (length(consentimiento) between 1 and 200),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'revisado', 'archivado')),
  cotizacion_id bigint references public.cotizaciones (id) on delete set null
);
create index if not exists formularios_created_idx on public.formularios (created_at desc);
create index if not exists formularios_cotizacion_idx on public.formularios (cotizacion_id);

alter table public.formularios enable row level security;

revoke all on public.formularios from anon, authenticated;
grant insert (nombre, negocio, telefono, email, proyecto, respuestas, consentimiento) on public.formularios to anon, authenticated;
grant select, delete on public.formularios to authenticated;
grant update (estado, cotizacion_id) on public.formularios to authenticated;

drop policy if exists for_insert_publico on public.formularios;
create policy for_insert_publico on public.formularios for insert to anon, authenticated
  with check (estado = 'nuevo' and cotizacion_id is null);
drop policy if exists for_admin on public.formularios;
create policy for_admin on public.formularios for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
