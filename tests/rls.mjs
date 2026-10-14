// Prueba los permisos (RLS) de supabase/migrations en Postgres real (PGlite), con un Supabase mínimo simulado.
// Uso: npm install @electric-sql/pglite@0.2.17 (en otra carpeta) y node tests/rls.mjs supabase/migrations/20261014000000_portal.sql
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const sql = readFileSync(process.argv[2], "utf8");
const db = new PGlite();
let ok = 0, bad = 0;
const check = (name, cond, extra = "") => { cond ? ok++ : bad++; console.log((cond ? "OK   " : "FALLA") + "  " + name + (cond ? "" : "  " + extra)); };

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema auth, storage, public to anon, authenticated;
  grant select, insert, delete on storage.objects to anon, authenticated;
  -- como Supabase: todo lo nuevo en public queda concedido a anon y authenticated (la migración debe revocarlo)
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`);

await db.exec(sql);
await db.exec(sql);   // debe poder correrse dos veces
check("la migración corre dos veces sin errores", true);

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b", ADM = "00000000-0000-0000-0000-0000000000ad";
await db.exec(`
  insert into auth.users values ('${A}', 'a@x.cl'), ('${B}', 'b@x.cl'), ('${ADM}', 'admin@x.cl');
  insert into private.admins values ('${ADM}');
  insert into public.proyectos (id, cliente_id, cliente_nombre, cliente_email, negocio) values
    ('11111111-1111-1111-1111-111111111111', '${A}', 'Ana', 'a@x.cl', 'Negocio A'),
    ('22222222-2222-2222-2222-222222222222', '${B}', 'Beto', 'b@x.cl', 'Negocio B');
  insert into public.briefs (proyecto_id) values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
`);

const as = async (role, uid, q) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ""}', false); set role ${role};`);
  try { const r = await db.query(q); return { rows: r.rows, n: r.affectedRows }; }
  catch (e) { return { err: e.message }; }
  finally { await db.exec("reset role"); }
};

// visitante anónimo
let r = await as("anon", null, `insert into public.cotizaciones (nombre, negocio, telefono) values ('Juan', 'Almacén', '+56 9 1')`);
check("anónimo: puede dejar una cotización", !r.err, r.err);
r = await as("anon", null, `select * from public.cotizaciones`);
check("anónimo: no puede leer cotizaciones", !!r.err || r.rows.length === 0, JSON.stringify(r));
r = await as("anon", null, `insert into public.cotizaciones (nombre, negocio, estado) values ('X', 'Y', 'aceptada')`);
check("anónimo: no puede fijar el estado", !!r.err);
r = await as("anon", null, `insert into public.cotizaciones (nombre, negocio, origen) values ('X', 'Y', 'manual')`);
check("anónimo: no puede marcar origen manual", !!r.err);
r = await as("anon", null, `insert into public.estimados (servicio, rubro, rango_min, rango_max) values ('pagina', 'barberia', 210000, 350000)`);
check("anónimo: puede registrar un estimado", !r.err, r.err);
r = await as("anon", null, `select * from public.estimados`);
check("anónimo: no puede leer estimados", !!r.err || r.rows.length === 0);
r = await as("anon", null, `select * from public.proyectos`);
check("anónimo: no ve proyectos", !!r.err || r.rows.length === 0);
r = await as("anon", null, `insert into public.cotizaciones (nombre, negocio) values ('${"x".repeat(200)}', 'Y')`);
check("anónimo: los largos están limitados", !!r.err);

// cliente A
r = await as("authenticated", A, `select negocio from public.proyectos`);
check("cliente: ve solo su proyecto", r.rows?.length === 1 && r.rows[0].negocio === "Negocio A", JSON.stringify(r));
r = await as("authenticated", A, `select * from public.cotizaciones`);
check("cliente: no ve cotizaciones", r.rows?.length === 0 || !!r.err);
r = await as("authenticated", A, `update public.proyectos set estado = 'publicado'`);
check("cliente: no puede cambiar el estado", !!r.err || r.n === 0, JSON.stringify(r));
r = await as("authenticated", A, `update public.briefs set respuestas = '{"Qué hace":"pan"}', actualizado_at = now()`);
check("cliente: guarda su brief (y solo el suyo)", r.n === 1, JSON.stringify(r));
r = await as("authenticated", A, `update public.briefs set enviado_at = now() where proyecto_id = '11111111-1111-1111-1111-111111111111'`);
check("cliente: no puede marcar el brief como enviado", !!r.err || r.n === 0, JSON.stringify(r));
r = await as("authenticated", A, `select respuestas from public.briefs`);
check("cliente: lee solo su brief", r.rows?.length === 1 && r.rows[0].respuestas["Qué hace"] === "pan");
await db.exec(`update public.briefs set enviado_at = now() where proyecto_id = '11111111-1111-1111-1111-111111111111'`);
r = await as("authenticated", A, `update public.briefs set respuestas = '{}'`);
check("cliente: brief enviado queda cerrado", r.n === 0, JSON.stringify(r));
r = await as("authenticated", A, `insert into private.admins values ('${A}')`);
check("cliente: no puede hacerse admin", !!r.err);
r = await as("authenticated", A, `select private.is_admin() as a`);
check("cliente: is_admin = false", r.rows?.[0]?.a === false, JSON.stringify(r));

r = await as("authenticated", A, `select public.soy_admin() as a`);
check("soy_admin: cliente = false", r.rows?.[0]?.a === false, JSON.stringify(r));
r = await as("authenticated", ADM, `select public.soy_admin() as a`);
check("soy_admin: admin = true", r.rows?.[0]?.a === true, JSON.stringify(r));
r = await as("anon", null, `select public.soy_admin() as a`);
check("soy_admin: anónimo no puede llamarla", !!r.err);

// archivos
r = await as("authenticated", A, `insert into storage.objects (bucket_id, name) values ('archivos', '11111111-1111-1111-1111-111111111111/logo.png')`);
check("archivos: el cliente sube a su carpeta", !r.err, r.err);
r = await as("authenticated", A, `insert into storage.objects (bucket_id, name) values ('archivos', '22222222-2222-2222-2222-222222222222/x.png')`);
check("archivos: no puede subir a la carpeta de otro", !!r.err);
await db.exec(`insert into storage.objects (bucket_id, name) values ('archivos', '22222222-2222-2222-2222-222222222222/b.png')`);
r = await as("authenticated", A, `select name from storage.objects`);
check("archivos: ve solo los suyos", r.rows?.length === 1, JSON.stringify(r));
r = await as("authenticated", A, `delete from storage.objects where name like '2222%'`);
check("archivos: no borra los de otro", r.n === 0 || !!r.err);
r = await as("anon", null, `select name from storage.objects`);
check("archivos: anónimo no ve nada", r.rows?.length === 0 || !!r.err);

// administrador
r = await as("authenticated", ADM, `select count(*)::int as n from public.cotizaciones`);
check("admin: ve las cotizaciones", r.rows?.[0]?.n === 1, JSON.stringify(r));
r = await as("authenticated", ADM, `update public.proyectos set estado = 'diseno' where negocio = 'Negocio B'`);
check("admin: cambia el estado", r.n === 1, JSON.stringify(r));
r = await as("authenticated", B, `select estado from public.historial order by created_at, id`);
check("historial: el cliente ve sus cambios de estado", JSON.stringify(r.rows?.map(x => x.estado)) === '["aceptada","diseno"]', JSON.stringify(r));
r = await as("authenticated", ADM, `update public.briefs set enviado_at = null where proyecto_id = '11111111-1111-1111-1111-111111111111'`);
check("admin: puede reabrir un brief", r.n === 1, JSON.stringify(r));
r = await as("authenticated", ADM, `insert into public.cotizaciones (origen, nombre, negocio, estado) values ('whatsapp', 'Pedro', 'Taller', 'propuesta')`);
check("admin: agrega una cotización de WhatsApp", !r.err, r.err);
r = await as("authenticated", ADM, `select count(*)::int as n from storage.objects`);
check("admin: ve todos los archivos", r.rows?.[0]?.n === 2);

console.log(`\n${ok}/${ok + bad} pruebas de permisos OK`);
process.exit(bad ? 1 : 0);
