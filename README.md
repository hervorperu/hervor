# Hervor — Web

Web de Hervor creada a partir del diseño de Canva (`docs/diseno-referencia.png`). Incluye:

- Landing "Próximamente" con enlaces a Instagram, TikTok y la carta en PDF.
- **Libro de Reclamaciones Virtual** (`/libro-de-reclamaciones`): genera el número de hoja correlativo,
  guarda en Supabase, genera el PDF de la hoja y envía los correos.
- Política de privacidad (`/politica-de-privacidad`).

👉 Puesta en marcha, variables de entorno, Gmail, revisión de reclamos y migración a Resend:
**[docs/libro-de-reclamaciones.md](docs/libro-de-reclamaciones.md)**

## Estructura

```
hervor-web/
├── index.html                    Landing (logo, "Próximamente", 3 botones, footer)
├── libro-de-reclamaciones.html   Formulario del Libro de Reclamaciones (Anexo I)
├── politica-de-privacidad.html   Política de privacidad (Ley 29733)
├── carta.pdf                     Carta de Hervor
├── css/styles.css                Tokens de marca, landing, header y footer
├── css/paginas.css               Páginas interiores: formulario, avisos, confirmación
├── js/config.js                  Enlaces de Instagram, TikTok y carta
├── js/main.js                    Botones de la landing
├── js/libro.js                   Formulario: validación, borrador, envío, confirmación
├── api/                          Funciones serverless de Vercel
│   ├── reclamos.js               POST: registra la hoja, PDF y correos
│   ├── cron/mantenimiento.js     Cron diario: mantiene Supabase activo y reintenta correos
│   └── admin/hoja.js             Descarga privada de la hoja con tu respuesta
├── lib/                          Lógica compartida
│   ├── reclamo-schema.js         Validación (la usan el navegador y el servidor)
│   ├── fechas.js                 Hora de Lima, feriados de Perú, días hábiles
│   ├── pdf.js                    PDF de la Hoja de Reclamación
│   ├── proveedor.js              Datos fijos del proveedor y textos legales
│   ├── servicio.js               Registro + envío de correos
│   ├── storage/                  Supabase (producción) / memoria (pruebas)
│   └── mail/                     Envío de correo: smtp (Gmail) / resend / outbox (pruebas)
├── supabase/schema.sql           Tablas y función atómica del correlativo
├── scripts/dev-server.mjs        Servidor local que imita a Vercel
├── tests/                        Pruebas automáticas (npm test)
├── assets/img/                   Logo y favicons
├── vercel.json                   URLs limpias, cron, cabeceras de seguridad
└── .env.example                  Plantilla de variables de entorno
```

## Trabajar en tu laptop

Node.js está instalado en `~/.local/node`. Para usarlo en la Terminal, añádelo una vez a tu PATH:

```bash
echo 'export PATH="$HOME/.local/node/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

Después:

```bash
cd ~/Documents/Proyectos/hervor-web && npm install && npm test
```

Para probar sin servicios externos (los correos se ven en <http://localhost:5173/__outbox>):

```bash
STORAGE_DRIVER=memory MAIL_PROVIDER=outbox MAIL_FROM_ADDRESS=prueba@example.com OWNER_EMAIL=prueba@example.com npm run dev
```

Para probar con Supabase y Gmail reales, copia `.env.example` como `.env.local`, rellena las claves y ejecuta `npm run dev`.

## Configurar los enlaces de la landing

En `js/config.js`: `instagram`, `tiktok` y `carta` (apunta a `carta.pdf`). Para actualizar la carta,
reemplaza `carta.pdf` por la nueva versión con el mismo nombre.

## Marca

| Uso | Valor |
|---|---|
| Fondo | `#452959` (morado) |
| Logo, botones, acentos y estados | `#D6A74E` (dorado) / `#E2B762` (hover) |
| Textos y avisos | `#EDE9E6` (crema) / `#FBF7F1` (tinta) |
| Tipografía | Montserrat (SemiBold en los botones) |

Los estados (error, foco, deshabilitado) usan solo estos colores y sus transparencias. No se usa ningún rojo.

## Publicar

Conecta el repositorio en Vercel (Framework preset: **Other**, sin comando de build), configura las
variables de entorno (ver la guía) y despliega.
