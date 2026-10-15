-- {found} studio · portal de clientes y panel de administración
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez.
--
-- Quién ve qué (lo hace cumplir la base de datos, no el sitio):
--   · visitante anónimo: solo puede AGREGAR cotizaciones y estimados; nunca leerlos.
--   · cliente: solo su(s) proyecto(s), su brief, su historial y sus archivos.
--   · administrador (tabla private.admins): todo.

create schema if not exists private;

-- ---------- administradores ----------
create table if not exists private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- versión pública para el panel y la función del servidor (solo dice si QUIEN PREGUNTA es admin)
create or replace function public.soy_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_admin(); $$;
revoke all on function public.soy_admin() from public, anon;
grant execute on function public.soy_admin() to authenticated;

-- ---------- cotizaciones (formulario, asistente, WhatsApp o ingreso manual) ----------
create table if not exists public.cotizaciones (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  origen text not null default 'formulario' check (origen in ('formulario', 'asistente', 'whatsapp', 'manual')),
  nombre text not null check (length(nombre) between 1 and 80),
  negocio text not null check (length(negocio) between 1 and 80),
  rubro text check (length(rubro) <= 80),
  servicio text check (length(servicio) <= 80),
  telefono text check (length(telefono) <= 30),
  email text check (length(email) <= 120),
  mensaje text check (length(mensaje) <= 2000),
  consentimiento text check (length(consentimiento) <= 200),
  estado text not null default 'nueva' check (estado in ('nueva', 'propuesta', 'aceptada', 'descartada')),
  notas text check (length(notas) <= 2000)
);
create index if not exists cotizaciones_created_idx on public.cotizaciones (created_at desc);

-- ---------- estimados del asistente (sin datos personales) ----------
create table if not exists public.estimados (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  servicio text not null check (length(servicio) <= 30),
  rubro text check (length(rubro) <= 80),
  rango_min integer check (rango_min between 0 and 100000000),
  rango_max integer check (rango_max between 0 and 100000000),
  detalle jsonb not null default '{}' check (pg_column_size(detalle) < 4000)
);
create index if not exists estimados_created_idx on public.estimados (created_at desc);

-- ---------- proyectos ----------
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  cotizacion_id bigint references public.cotizaciones (id) on delete set null,
  cliente_id uuid not null references auth.users (id) on delete cascade,
  cliente_nombre text not null check (length(cliente_nombre) <= 80),
  cliente_email text not null check (length(cliente_email) <= 120),
  cliente_telefono text check (length(cliente_telefono) <= 30),
  negocio text not null check (length(negocio) <= 80),
  servicio text not null default 'pagina' check (servicio in ('pagina', 'tienda', 'software', 'varios')),
  estado text not null default 'aceptada' check (estado in ('aceptada', 'brief', 'diseno', 'revision', 'publicado')),
  url_publicada text check (length(url_publicada) <= 300)
);
create index if not exists proyectos_cliente_idx on public.proyectos (cliente_id);
create index if not exists proyectos_cotizacion_idx on public.proyectos (cotizacion_id);

-- historial de estados: lo llena un trigger, para mostrar fechas en la línea de tiempo
create table if not exists public.historial (
  id bigint generated always as identity primary key,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  estado text not null,
  created_at timestamptz not null default now()
);
create index if not exists historial_proyecto_idx on public.historial (proyecto_id, created_at);

create or replace function private.tocar_proyecto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_at := now();
  return new;
end;
$$;
drop trigger if exists proyectos_tocar on public.proyectos;
create trigger proyectos_tocar before update on public.proyectos
  for each row execute function private.tocar_proyecto();

-- AFTER: el proyecto ya existe cuando se escribe su historial
create or replace function private.registrar_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.historial (proyecto_id, estado) values (new.id, new.estado);
  end if;
  return null;
end;
$$;
drop trigger if exists proyectos_estado on public.proyectos;
create trigger proyectos_estado after insert or update of estado on public.proyectos
  for each row execute function private.registrar_estado();

-- ---------- briefs: uno por proyecto, se guarda mientras el cliente escribe ----------
create table if not exists public.briefs (
  proyecto_id uuid primary key references public.proyectos (id) on delete cascade,
  respuestas jsonb not null default '{}' check (pg_column_size(respuestas) < 60000),
  actualizado_at timestamptz not null default now(),
  enviado_at timestamptz
);

-- ---------- permisos por fila ----------
alter table public.cotizaciones enable row level security;
alter table public.estimados enable row level security;
alter table public.proyectos enable row level security;
alter table public.historial enable row level security;
alter table public.briefs enable row level security;

-- privilegios de tabla: lo mínimo por rol (RLS filtra las filas encima de esto)
revoke all on public.cotizaciones, public.estimados, public.proyectos, public.historial, public.briefs from anon, authenticated;
grant insert (origen, nombre, negocio, rubro, servicio, telefono, email, mensaje, consentimiento) on public.cotizaciones to anon, authenticated;
grant insert (servicio, rubro, rango_min, rango_max, detalle) on public.estimados to anon, authenticated;
grant select, update, delete on public.cotizaciones to authenticated;
grant insert (origen, nombre, negocio, rubro, servicio, telefono, email, mensaje, estado, notas) on public.cotizaciones to authenticated;
grant select, delete on public.estimados to authenticated;
grant select, insert, update, delete on public.proyectos to authenticated;
grant select on public.historial to authenticated;
grant select on public.briefs to authenticated;
grant update (respuestas, actualizado_at) on public.briefs to authenticated;   -- enviado_at solo lo marca la función del servidor
grant update (enviado_at) on public.briefs to authenticated;                    -- …o el admin al reabrir (RLS lo limita a admin)

-- cotizaciones
drop policy if exists cot_insert_publico on public.cotizaciones;
create policy cot_insert_publico on public.cotizaciones for insert to anon, authenticated
  with check (estado = 'nueva' and origen in ('formulario', 'asistente'));
drop policy if exists cot_admin on public.cotizaciones;
create policy cot_admin on public.cotizaciones for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- estimados
drop policy if exists est_insert_publico on public.estimados;
create policy est_insert_publico on public.estimados for insert to anon, authenticated with check (true);
drop policy if exists est_admin on public.estimados;
create policy est_admin on public.estimados for select to authenticated using ((select private.is_admin()));
drop policy if exists est_admin_borrar on public.estimados;
create policy est_admin_borrar on public.estimados for delete to authenticated using ((select private.is_admin()));

-- proyectos: el cliente solo LEE los suyos; el admin hace todo
drop policy if exists pro_cliente on public.proyectos;
create policy pro_cliente on public.proyectos for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists pro_admin on public.proyectos;
create policy pro_admin on public.proyectos for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- historial
drop policy if exists his_ver on public.historial;
create policy his_ver on public.historial for select to authenticated
  using ((select private.is_admin()) or exists (
    select 1 from public.proyectos p where p.id = proyecto_id and p.cliente_id = (select auth.uid())));

-- briefs: el cliente lee el suyo y lo edita mientras no lo haya enviado
drop policy if exists bri_ver on public.briefs;
create policy bri_ver on public.briefs for select to authenticated
  using ((select private.is_admin()) or exists (
    select 1 from public.proyectos p where p.id = proyecto_id and p.cliente_id = (select auth.uid())));
drop policy if exists bri_editar on public.briefs;
create policy bri_editar on public.briefs for update to authenticated
  using (enviado_at is null and exists (
    select 1 from public.proyectos p where p.id = proyecto_id and p.cliente_id = (select auth.uid())))
  with check (enviado_at is null and exists (
    select 1 from public.proyectos p where p.id = proyecto_id and p.cliente_id = (select auth.uid())));
drop policy if exists bri_admin on public.briefs;
create policy bri_admin on public.briefs for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------- archivos: bucket privado, una carpeta por proyecto (<proyecto_id>/archivo.jpg) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archivos', 'archivos', false, 26214400,   -- 25 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/svg+xml',
        'application/pdf', 'application/postscript', 'application/zip', 'video/mp4', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.es_mi_proyecto(carpeta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proyectos
    where id::text = carpeta and cliente_id = (select auth.uid()));
$$;
revoke all on function private.es_mi_proyecto(text) from public, anon;
grant execute on function private.es_mi_proyecto(text) to authenticated;

drop policy if exists arc_ver on storage.objects;
create policy arc_ver on storage.objects for select to authenticated
  using (bucket_id = 'archivos' and ((select private.is_admin()) or private.es_mi_proyecto((storage.foldername(name))[1])));
drop policy if exists arc_subir on storage.objects;
create policy arc_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'archivos' and ((select private.is_admin()) or private.es_mi_proyecto((storage.foldername(name))[1])));
drop policy if exists arc_borrar on storage.objects;
create policy arc_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'archivos' and ((select private.is_admin()) or private.es_mi_proyecto((storage.foldername(name))[1])));

-- ---------- último paso, a mano: hacerte administrador ----------
-- 1. Entra una vez a foundstudio.cl/panel/ con tu correo (te llega el enlace).
-- 2. Corre esto con tu correo:
--    insert into private.admins (user_id) select id from auth.users where email = 'admin@foundstudio.cl' on conflict do nothing;
