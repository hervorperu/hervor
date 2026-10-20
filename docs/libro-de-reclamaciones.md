# Libro de Reclamaciones Virtual — Guía de puesta en marcha y uso

Esta guía explica cómo dejar funcionando el Libro de Reclamaciones de Hervor en internet,
cómo revisar las hojas recibidas y cómo registrar tus respuestas.

---

## 1. Cómo funciona

1. El consumidor llena el formulario en `/libro-de-reclamaciones`. No necesita cuenta.
2. La función `api/reclamos.js` (en Vercel):
   - valida los datos y aplica el anti-spam (campo trampa, tiempo mínimo y máximo 5 hojas por conexión cada 15 minutos);
   - en **una sola transacción** de Supabase asigna el N° de hoja (`0001-2026`, se reinicia cada año) y guarda la hoja.
     Dos envíos simultáneos nunca reciben el mismo número y no quedan saltos;
   - genera el PDF con el formato del Anexo I;
   - envía la constancia al consumidor y una alerta a `OWNER_EMAIL` con el PDF y la fecha límite
     (15 días hábiles, sin sábados, domingos ni feriados de Perú).
3. El consumidor ve su N° de hoja, la fecha límite y un botón para descargar el PDF.
4. Si un correo falla, la hoja **queda guardada** igualmente. El consumidor lo ve en pantalla y puede
   descargar el PDF. Un cron diario de Vercel reintenta el envío (hasta 5 veces).
5. Si el guardado falla, el consumidor ve un error claro y **no pierde lo que escribió**
   (el formulario conserva los datos y además guarda un borrador en su navegador).

---

## 2. Supabase (base de datos)

1. Crea una cuenta en <https://supabase.com> y un proyecto nuevo (plan Free).
   - Región recomendada: **South America (São Paulo)**.
   - Guarda la contraseña de la base de datos en un lugar seguro.
2. En el proyecto: **SQL Editor → New query**. Pega todo el contenido de `supabase/schema.sql` y pulsa **Run**.
   Se crean las tablas `reclamos` y `contadores_hoja` y la función `registrar_reclamo`.
3. Copia dos datos de Supabase:
   - **Project URL** → variable `SUPABASE_URL`. Está en **Project Settings → Data API**
     (o en el botón **Connect** de la página principal del proyecto). Tiene la forma `https://abcdefgh.supabase.co`.
   - **Clave secreta** → variable `SUPABASE_SERVICE_ROLE_KEY`. Está en **Project Settings → API Keys**:
     - pestaña **API Keys** → sección **Secret keys** → pulsa el ojo o **Copy** en la clave `default`
       (empieza por `sb_secret_…`); si no hay ninguna, pulsa **Add new secret key**;
     - o bien la pestaña **Legacy API Keys** → clave **service_role** (empieza por `eyJ…`).
     Cualquiera de las dos sirve. **No** uses la *publishable* / *anon*: esa es pública y no tiene permisos.
     ⚠️ La clave secreta nunca va en el código ni se comparte (tampoco por chat).
   Pégalas solo en tu archivo `.env.local` (para probar en tu laptop) y en Vercel.

> **Plan gratuito.** Supabase pausa los proyectos gratis tras 7 días sin actividad. El cron diario
> (`/api/cron/mantenimiento`) hace una consulta cada día para mantenerlo activo. Además, cada hoja
> te llega en PDF por correo, lo que sirve como segunda copia. Te recomiendo exportar la tabla a CSV
> una vez al mes (**Table Editor → reclamos → Export → CSV**). Las hojas deben conservarse
> **al menos 2 años**: no borres filas de la tabla.

---

## 3. Gmail: contraseña de aplicación

Los correos salen desde una cuenta de Gmail de Hervor por SMTP. Gmail exige una
**contraseña de aplicación**, que solo existe si la verificación en 2 pasos está activada.

### 3.1 Activar la verificación en 2 pasos
1. Entra a <https://myaccount.google.com> con la cuenta de Gmail de Hervor.
2. Menú **Seguridad** (en algunas cuentas se llama **Seguridad e inicio de sesión**).
3. En "Cómo inicias sesión en Google", pulsa **Verificación en 2 pasos** → **Activar**.
4. Sigue los pasos: confirma tu número de teléfono y el código que te llega por SMS.

### 3.2 Generar la contraseña de aplicación
1. Ve a <https://myaccount.google.com/apppasswords>.
   También puedes buscar "Contraseñas de aplicaciones" en la barra de búsqueda de tu cuenta de Google.
2. Escribe un nombre, por ejemplo `Hervor web`, y pulsa **Crear**.
3. Google muestra una clave de **16 letras** (en 4 grupos). Cópiala **sin espacios**: es el valor de `SMTP_PASS`.
   Solo se muestra una vez. Si la pierdes, borra esa contraseña y crea otra.
4. Valores para Vercel:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465`
   - `SMTP_USER=` el correo de Gmail de Hervor
   - `MAIL_FROM_ADDRESS=` el **mismo** correo de Gmail
   - `MAIL_FROM_NAME=Hervor`

> Si cambias la contraseña de la cuenta de Google, las contraseñas de aplicación se anulan
> y tendrás que generar una nueva. Gmail permite unos 500 correos al día, más que suficiente.

---

## 4. Variables de entorno en Vercel

En Vercel: **Project → Settings → Environment Variables**. Crea cada variable, marca
**Production** (y **Preview** si quieres probar en ramas) y guarda. Después ve a
**Deployments → ⋯ → Redeploy** para que se apliquen.

| Variable | Valor | Secreta |
|---|---|---|
| `SITE_URL` | URL pública de la web, p. ej. `https://hervor.vercel.app` | No |
| `STORAGE_DRIVER` | `supabase` | No |
| `SUPABASE_URL` | Project URL de Supabase | No |
| `SUPABASE_SERVICE_ROLE_KEY` | clave service_role | **Sí** |
| `MAIL_PROVIDER` | `smtp` | No |
| `MAIL_FROM_NAME` | `Hervor` | No |
| `MAIL_FROM_ADDRESS` | Gmail de Hervor | No |
| `MAIL_REPLY_TO` | (opcional) correo para respuestas | No |
| `OWNER_EMAIL` | correo donde recibes las alertas | No |
| `SMTP_HOST` | `smtp.gmail.com` | No |
| `SMTP_PORT` | `465` | No |
| `SMTP_USER` | Gmail de Hervor | No |
| `SMTP_PASS` | contraseña de aplicación (16 letras, sin espacios) | **Sí** |
| `CRON_SECRET` | texto aleatorio largo (ver abajo) | **Sí** |
| `ADMIN_PASSWORD` | contraseña para descargar hojas con tu respuesta | **Sí** |

Para generar un `CRON_SECRET` seguro, ejecuta en la Terminal:

```bash
openssl rand -hex 32
```

Vercel envía automáticamente `CRON_SECRET` al ejecutar el cron diario configurado en `vercel.json`.

---

## 5. Revisar las hojas recibidas

- **Al instante:** te llega un correo a `OWNER_EMAIL` con el asunto
  `Nuevo reclamo · Hoja N° 0001-2026 · responder antes del …`, con el PDF adjunto.
- **En Supabase:** **Table Editor → reclamos**. Cada fila es una hoja. Las columnas importantes son:
  - `numero_hoja`, `creado_en`, `fecha_limite_respuesta`;
  - los datos del consumidor y del reclamo;
  - `estado_correo_consumidor` / `estado_correo_proveedor`: `enviado`, `error` o `pendiente`;
  - `ultimo_error`: el motivo si un correo falló.
  Puedes ordenar por `fecha_limite_respuesta` para ver qué vence primero.

## 6. Registrar tu respuesta (sección 4)

1. En **Table Editor → reclamos**, abre la fila de la hoja.
2. Escribe en `respuesta` las observaciones y acciones adoptadas.
3. Pon en `fecha_respuesta` la fecha en que comunicas la respuesta al consumidor.
4. Descarga la hoja con la sección 4 completa en:
   `https://TU-DOMINIO/api/admin/hoja?numero=0001-2026`
   El navegador pedirá usuario y contraseña: usuario **hervor** y contraseña `ADMIN_PASSWORD`.
5. Firma el PDF (si lo deseas) y envíaselo al consumidor respondiendo al correo que recibió,
   dentro del plazo de 15 días hábiles.

---

## 7. Feriados

`lib/fechas.js` incluye los feriados nacionales fijos más Jueves y Viernes Santo, que se calculan cada año.
Si el Gobierno declara un feriado nuevo o extraordinario, añádelo a `FERIADOS_EXTRA` con el formato
`"AAAA-MM-DD"` y vuelve a desplegar. Revisa la lista cada enero en <https://www.gob.pe/feriados>.

---

## 8. Migrar a un correo con dominio propio (Resend)

Cuando Hervor tenga dominio propio (p. ej. `hervor.pe`):

1. Crea una cuenta en <https://resend.com> y añade tu dominio en **Domains → Add Domain**.
2. Copia los registros DNS que indica Resend (SPF, DKIM y, recomendado, DMARC) en el panel
   donde compraste el dominio. Espera a que Resend marque el dominio como **Verified**.
3. En **API Keys → Create API Key** crea una clave con permiso "Sending access".
4. En Vercel cambia solo estas variables:
   - `MAIL_PROVIDER=resend`
   - `RESEND_API_KEY=` la clave del paso 3
   - `MAIL_FROM_ADDRESS=` una dirección de tu dominio, p. ej. `reclamos@hervor.pe`
   - (opcional) `MAIL_REPLY_TO=` la dirección donde quieres recibir respuestas
5. Haz **Redeploy** y envía una hoja de prueba.
6. Cuando todo funcione, puedes borrar `SMTP_*` de Vercel y revocar la contraseña de aplicación de Gmail.

No hay que tocar código: todo el envío pasa por `lib/mail/index.js`, que elige el proveedor según `MAIL_PROVIDER`.

---

## 9. Probar en tu laptop

```bash
cd ~/Documents/Proyectos/hervor-web
npm install
npm test
```

Modo de prueba sin servicios externos: las hojas se guardan en memoria y los correos en `.outbox/`.

```bash
STORAGE_DRIVER=memory MAIL_PROVIDER=outbox MAIL_FROM_ADDRESS=prueba@example.com OWNER_EMAIL=prueba@example.com npm run dev
```

- Web: <http://localhost:5173>
- Correos de prueba: <http://localhost:5173/__outbox>

Modo real: copia `.env.example` como `.env.local`, rellena tus claves y ejecuta `npm run dev`.
Las hojas se guardarán en tu Supabase real y los correos se enviarán de verdad.
