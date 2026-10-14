# Portal de clientes y panel · puesta en marcha

Proyecto Supabase: `qwmxzaeyhqdwndijquab` (https://qwmxzaeyhqdwndijquab.supabase.co).
Mientras `SUPABASE_ANON_KEY` esté vacío en `assets/js/site.js`, el sitio funciona como antes y `/mi-proyecto/` y `/panel/` dicen «todavía no está activo».

> Si Claude Code tiene el MCP de Supabase autenticado (`claude /mcp` en una terminal normal), los pasos 1, 4 y 6 los puede hacer Claude directamente.

## 1. Base de datos (2 min)
Supabase → **SQL Editor** → New query → pega todo `supabase/migrations/20261014000000_portal.sql` → **Run**.
Se puede volver a correr sin romper nada.

## 2. Inicio de sesión (3 min)
Supabase → **Authentication**:
- **Sign In / Providers → Email**: activado. **Allow new users to sign up: APAGADO** (las cuentas las crea el estudio al aceptar). **Email OTP Expiration: 86400** (el enlace dura 24 horas).
- **URL Configuration**: Site URL `https://foundstudio.cl`. Redirect URLs: `https://foundstudio.cl/mi-proyecto/` y `https://foundstudio.cl/panel/`.

## 3. Correo con Resend (10 min + espera del DNS)
1. Resend → **Domains → Add domain** → `foundstudio.cl`. Copia los registros DNS que muestra (TXT y MX) en el panel de tu dominio. Espera a que diga «Verified».
   Sin este paso Resend solo manda correos a la cuenta dueña (steamcraft14@gmail.com), no a tus clientes.
2. Supabase → **Authentication → Emails → SMTP Settings** → Enable custom SMTP:
   host `smtp.resend.com` · port `465` · user `resend` · password = tu clave de Resend · sender `hola@foundstudio.cl` · name `{found} studio`.
3. **Authentication → Emails → Templates → Magic link**, en español:
   - Asunto: `Tu enlace para entrar a {found} studio`
   - Cuerpo: `<h2>Entra a tu proyecto</h2><p>Aprieta el botón para entrar. El enlace sirve una vez y dura 24 horas.</p><p><a href="{{ .ConfirmationURL }}">Entrar a mi proyecto</a></p><p>Si no lo pediste, ignora este correo.</p>`

## 4. Función del servidor (5 min)
Supabase → **Edge Functions → Deploy a new function → Via Editor** → nombre **`found`** → pega `supabase/functions/found/index.ts` → **Deploy**.
Luego **Edge Functions → Secrets** → agrega:

| Nombre | Valor |
|---|---|
| `RESEND_API_KEY` | la clave `re_…` de Resend (secreta: nunca en el repo) |
| `MAIL_FROM` | `{found} studio <hola@foundstudio.cl>` |
| `ADMIN_EMAIL` | `contacto@foundstudio.cl` |
| `SITE_URL` | `https://foundstudio.cl` |
| `GOATCOUNTER_TOKEN` | (opcional, paso 7) |

## 5. Conectar el sitio (1 min)
Supabase → **Project Settings → API** → copia la clave **anon public** (es pública, va en el sitio).
Pégala en `assets/js/site.js` → `SUPABASE_ANON_KEY`, sube `?v=` de `site.js` en todas las páginas y haz push.
La clave **service_role** nunca va en el sitio ni en el repo.

## 6. Hacerte administrador (2 min)
1. Supabase → **Authentication → Users → Add user → Create new user** → `contacto@foundstudio.cl`, marca «Auto Confirm User».
2. SQL Editor → Run:
   `insert into private.admins (user_id) select id from auth.users where email = 'contacto@foundstudio.cl' on conflict do nothing;`
3. Entra a `foundstudio.cl/panel/` con ese correo: te llega el enlace.

## 7. Visitas en el panel (opcional)
GoatCounter → Settings → **API** → New token con permiso de lectura de estadísticas → guárdalo como secreto `GOATCOUNTER_TOKEN` (paso 4).

## Cómo se usa
1. Llega una cotización (formulario, asistente o la agregas tú desde «Cotizaciones» si llegó por WhatsApp).
2. Mandas la propuesta → «Propuesta enviada».
3. Cuando acepta → «Aceptada» → confirmas su correo → «Crear proyecto y enviar acceso». Al cliente le llega el enlace.
4. El cliente completa el brief (se guarda solo), sube logo y fotos y lo envía: te llega un correo y el proyecto pasa a Diseño.
5. Tú cambias la etapa (Diseño → Revisión → Publicado) con «Avisar al cliente por correo» marcado.

## Ojo
- Plan gratis: si el proyecto pasa 7 días sin uso, Supabase lo pausa. Se reactiva con un clic en el panel de Supabase. Con clientes constantes conviene el plan pagado (~USD 25/mes).
- Archivos: bucket privado `archivos`, una carpeta por proyecto, 25 MB por archivo.
- Borrar brief y archivos 12 meses después de publicada cada página (lo promete `privacidad.html`).

## Pruebas
- `python tests/portal_qa.py`: portal y panel con un Supabase simulado (nunca llama al real).
- `node tests/rls.mjs supabase/migrations/20261014000000_portal.sql`: permisos en Postgres real (PGlite).
