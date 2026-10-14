// {found} studio · función del servidor (Supabase Edge Function "found")
// Es lo único que usa claves secretas; el sitio solo tiene la clave pública (anon).
//
// Acciones (POST con { accion, ... } y la sesión del usuario):
//   invitar        admin: crea el proyecto desde una cotización aceptada y le manda al cliente el enlace de acceso
//   enlace         admin: reenvía el enlace de acceso a un cliente
//   estado         admin: cambia el estado del proyecto y, si se pide, avisa al cliente por correo
//   brief-enviado  cliente: cierra su brief, pasa el proyecto a Diseño y te avisa por correo
//   visitas        admin: resumen de GoatCounter de los últimos 30 días
//
// Secretos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY     clave de Resend (secreta)
//   MAIL_FROM          remitente verificado en Resend, ej. "{found} studio <hola@foundstudio.cl>"
//   ADMIN_EMAIL        dónde te llegan los avisos, ej. contacto@foundstudio.cl
//   SITE_URL           https://foundstudio.cl
//   GOATCOUNTER_TOKEN  (opcional) token de la API de GoatCounter, para las visitas en el panel
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SITE = env("SITE_URL", "https://foundstudio.cl").replace(/\/$/, "");
const ORIGENES = [SITE, "http://127.0.0.1:8417", "http://localhost:8417"];

const ESTADOS: Record<string, string> = {
  aceptada: "Propuesta aceptada",
  brief: "Brief",
  diseno: "Diseño",
  revision: "Revisión",
  publicado: "Publicado",
};
const SERVICIOS = ["pagina", "tienda", "software", "varios"];

class Falla extends Error { constructor(public status: number, msg: string) { super(msg); } }

const cors = (req: Request) => {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : SITE,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/* ---------- correo ---------- */
const plantilla = (titulo: string, parrafos: string[], boton?: { texto: string; url: string }) => `<!doctype html>
<html lang="es"><body style="margin:0;background:#F2ECDF;font-family:Arial,Helvetica,sans-serif;color:#1F2A4A">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;margin:0 0 24px"><span style="color:#C586C0">{</span>found<span style="color:#C586C0">}</span> <span style="font-size:12px;letter-spacing:3px;font-weight:400">studio</span></p>
  <div style="background:#fff;border-radius:16px;padding:28px 24px">
    <h1 style="font-size:22px;margin:0 0 16px;line-height:1.25">${esc(titulo)}</h1>
    ${parrafos.map(p => `<p style="font-size:16px;line-height:1.55;margin:0 0 14px">${p}</p>`).join("")}
    ${boton ? `<p style="margin:24px 0 8px"><a href="${esc(boton.url)}" style="display:inline-block;background:#C586C0;color:#0F1528;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:999px">${esc(boton.texto)}</a></p>` : ""}
  </div>
  <p style="font-size:13px;color:#5A6385;margin:20px 4px 0">{found} studio · Huechuraba, Santiago · <a href="${SITE}" style="color:#5A6385">foundstudio.cl</a> · WhatsApp +56 9 4257 9133</p>
</div></body></html>`;

async function enviarCorreo(para: string, asunto: string, html: string, responderA?: string) {
  const key = env("RESEND_API_KEY");
  if (!key) throw new Falla(500, "Falta RESEND_API_KEY en los secretos de la función.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("MAIL_FROM", "{found} studio <onboarding@resend.dev>"),
      to: [para], subject: asunto, html,
      ...(responderA ? { reply_to: responderA } : {}),
    }),
  });
  if (!res.ok) throw new Falla(502, `Resend respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* ---------- acceso ---------- */
async function enlaceDeAcceso(admin: SupabaseClient, email: string, nombre: string) {
  // crea la cuenta si no existe (sin contraseña) y genera un enlace de acceso directo
  const { error: e1 } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nombre } });
  if (e1 && !/already|registered|exists/i.test(e1.message)) throw new Falla(400, e1.message);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink", email, options: { redirectTo: `${SITE}/mi-proyecto/` },
  });
  if (error || !data?.user) throw new Falla(400, error?.message ?? "No se pudo generar el enlace.");
  return { userId: data.user.id, link: data.properties.action_link };
}

const correoAcceso = (nombre: string, negocio: string, link: string, nuevo: boolean) => plantilla(
  nuevo ? `¡Partimos con ${negocio}!` : `Tu acceso a ${negocio}`,
  [
    `Hola ${esc(nombre.split(" ")[0])},`,
    nuevo
      ? "Gracias por confiar en nosotros. Preparamos un espacio para tu proyecto: ahí completas el brief (se guarda solo mientras escribes), subes tu logo y tus fotos y ves en qué etapa va tu página."
      : "Aquí tienes un enlace nuevo para entrar a tu proyecto.",
    "Entras sin contraseña, con este botón. Si el enlace venció, entra a " +
      `<a href="${SITE}/mi-proyecto/">foundstudio.cl/mi-proyecto</a> y pide uno nuevo con tu correo.`,
  ],
  { texto: "Entrar a mi proyecto", url: link },
);

/* ---------- acciones ---------- */
type Ctx = { user: { id: string; email?: string }; db: SupabaseClient; admin: SupabaseClient; esAdmin: boolean; body: Record<string, unknown> };

const soloAdmin = (c: Ctx) => { if (!c.esAdmin) throw new Falla(403, "Solo para el administrador."); };

const acciones: Record<string, (c: Ctx) => Promise<unknown>> = {
  async invitar(c) {
    soloAdmin(c);
    const email = texto(c.body.email, 120).toLowerCase();
    const nombre = texto(c.body.nombre, 80), negocio = texto(c.body.negocio, 80);
    const servicio = SERVICIOS.includes(c.body.servicio as string) ? c.body.servicio as string : "pagina";
    const cotizacion_id = Number(c.body.cotizacion_id) || null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Falla(400, "El correo del cliente no es válido.");
    if (!nombre || !negocio) throw new Falla(400, "Faltan el nombre o el negocio.");

    const { userId, link } = await enlaceDeAcceso(c.admin, email, nombre);
    const { data: p, error } = await c.admin.from("proyectos").insert({
      cotizacion_id, cliente_id: userId, cliente_nombre: nombre, cliente_email: email,
      cliente_telefono: texto(c.body.telefono, 30) || null, negocio, servicio, estado: "brief",
    }).select("id").single();
    if (error) throw new Falla(400, error.message);
    await c.admin.from("briefs").insert({ proyecto_id: p.id, respuestas: { Nombre: nombre, Negocio: negocio, Correo: email, WhatsApp: texto(c.body.telefono, 30), Proyecto: servicio } });
    if (cotizacion_id) await c.admin.from("cotizaciones").update({ estado: "aceptada" }).eq("id", cotizacion_id);

    await enviarCorreo(email, `Tu proyecto con {found} studio: ${negocio}`, correoAcceso(nombre, negocio, link, true), env("ADMIN_EMAIL") || undefined);
    return { proyecto_id: p.id };
  },

  async enlace(c) {
    soloAdmin(c);
    const { data: p } = await c.admin.from("proyectos").select("cliente_email, cliente_nombre, negocio").eq("id", c.body.proyecto_id).single();
    if (!p) throw new Falla(404, "No encontramos el proyecto.");
    const { link } = await enlaceDeAcceso(c.admin, p.cliente_email, p.cliente_nombre);
    await enviarCorreo(p.cliente_email, `Tu acceso a ${p.negocio}`, correoAcceso(p.cliente_nombre, p.negocio, link, false), env("ADMIN_EMAIL") || undefined);
    return { ok: true };
  },

  async estado(c) {
    soloAdmin(c);
    const estado = c.body.estado as string;
    if (!ESTADOS[estado]) throw new Falla(400, "Estado desconocido.");
    const cambios: Record<string, unknown> = { estado };
    if (typeof c.body.url_publicada === "string") cambios.url_publicada = texto(c.body.url_publicada, 300) || null;
    const { data: p, error } = await c.db.from("proyectos").update(cambios).eq("id", c.body.proyecto_id)
      .select("cliente_email, cliente_nombre, negocio, url_publicada").single();
    if (error || !p) throw new Falla(400, error?.message ?? "No encontramos el proyecto.");
    if (c.body.avisar) {
      const extra: Record<string, string> = {
        diseno: "Ya tenemos todo lo necesario y estamos diseñando tu página.",
        revision: "Tu página está lista para que la revises. Entra, mírala con calma y cuéntanos qué cambiarías.",
        publicado: `¡Tu página ya está en línea!${p.url_publicada ? ` La encuentras en <a href="${esc(p.url_publicada)}">${esc(p.url_publicada.replace(/^https?:\/\//, ""))}</a>.` : ""}`,
        brief: "Te falta completar el brief para que podamos empezar.",
        aceptada: "Tu proyecto quedó registrado.",
      };
      await enviarCorreo(p.cliente_email, `${p.negocio}: ${ESTADOS[estado]}`, plantilla(`Tu proyecto pasó a «${ESTADOS[estado]}»`,
        [`Hola ${esc(p.cliente_nombre.split(" ")[0])},`, extra[estado]], { texto: "Ver mi proyecto", url: `${SITE}/mi-proyecto/` }), env("ADMIN_EMAIL") || undefined);
    }
    return { ok: true };
  },

  async "brief-enviado"(c) {
    // la consulta con la sesión del cliente solo encuentra el proyecto si es suyo (RLS)
    const { data: p } = await c.db.from("proyectos").select("id, negocio, cliente_nombre, cliente_email, estado").eq("id", c.body.proyecto_id).single();
    if (!p) throw new Falla(404, "No encontramos tu proyecto.");
    const { data: b } = await c.admin.from("briefs").update({ enviado_at: new Date().toISOString() })
      .eq("proyecto_id", p.id).is("enviado_at", null).select("respuestas").single();
    if (!b) throw new Falla(409, "Este brief ya fue enviado.");
    if (["aceptada", "brief"].includes(p.estado)) await c.admin.from("proyectos").update({ estado: "diseno" }).eq("id", p.id);
    const to = env("ADMIN_EMAIL");
    if (to) {
      const filas = Object.entries(b.respuestas as Record<string, unknown>)
        .filter(([, v]) => String(v ?? "").trim())
        .map(([k, v]) => `<strong>${esc(k)}:</strong> ${esc([].concat(v as never).join(", "))}`);
      await enviarCorreo(to, `Brief enviado: ${p.negocio}`, plantilla(`${p.negocio} envió su brief`,
        [`${esc(p.cliente_nombre)} (${esc(p.cliente_email)}) terminó el brief. El proyecto pasó a Diseño.`, ...filas.slice(0, 60)],
        { texto: "Abrir en el panel", url: `${SITE}/panel/#p=${p.id}` }), p.cliente_email);
    }
    return { ok: true };
  },

  async visitas(c) {
    soloAdmin(c);
    const token = env("GOATCOUNTER_TOKEN");
    if (!token) return { configurado: false };
    const fin = new Date(), inicio = new Date(Date.now() - 30 * 864e5);
    const q = `start=${inicio.toISOString().slice(0, 10)}&end=${fin.toISOString().slice(0, 10)}`;
    const gc = (ruta: string) => fetch(`https://foundstudio.goatcounter.com/api/v0/${ruta}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Falla(502, `GoatCounter respondió ${r.status}`)));
    const [total, refs, hits] = await Promise.all([gc(`stats/total?${q}`), gc(`stats/toprefs?${q}`), gc(`stats/hits?${q}&limit=50`)]);
    return {
      configurado: true,
      total: total.total ?? 0,
      eventos: total.total_events ?? 0,
      origenes: (refs.stats ?? []).map((r: { name?: string; count?: number }) => ({ nombre: r.name || "(directo)", visitas: r.count ?? 0 })),
      paginas: (hits.hits ?? []).map((h: { path?: string; count?: number; event?: boolean }) => ({ ruta: h.path, visitas: h.count ?? 0, evento: !!h.event })),
    };
  },
};

Deno.serve(async req => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { ...h, "Content-Type": "application/json" } });
  try {
    if (req.method !== "POST") throw new Falla(405, "Usa POST.");
    const auth = req.headers.get("Authorization") ?? "";
    const db = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const { data: { user } } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) throw new Falla(401, "Inicia sesión de nuevo.");
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const accion = acciones[body.accion as string];
    if (!accion) throw new Falla(400, "Acción desconocida.");
    const { data: esAdmin } = await db.rpc("soy_admin");
    return json(200, await accion({ user, db, admin, esAdmin: esAdmin === true, body }));
  } catch (e) {
    const status = e instanceof Falla ? e.status : 500;
    console.error(e);
    return json(status, { error: e instanceof Error ? e.message : "Error inesperado." });
  }
});
