# Hervor — Landing "Próximamente"

Página web de Hervor creada a partir del diseño de Canva (ver `docs/diseno-referencia.png`).

## Estructura

```
hervor-web/
├── index.html              Página principal (logo, "Próximamente", lema y 3 botones)
├── css/styles.css          Estilos: colores, tipografías, responsive y animaciones
├── js/config.js            ← AQUÍ se ponen los enlaces de Instagram, TikTok y la carta
├── js/main.js              Conecta los botones con los enlaces / muestra aviso si faltan
├── assets/img/
│   ├── logo-hervor.png     Logo (extraído del diseño, fondo transparente)
│   └── favicon.png         Icono de la pestaña (llama del logo)
├── carta.pdf               Carta de Hervor (se abre en /carta.pdf)
├── docs/diseno-referencia.png   Diseño original de Canva
└── robots.txt
```

Es una web estática: HTML + CSS + JavaScript sin dependencias ni proceso de compilación.

## Verla en tu laptop

Desde la Terminal:

```bash
cd ~/Documents/Proyectos/hervor-web
python3 -m http.server 5173
```

Luego abre <http://localhost:5173> en el navegador. Para detener el servidor: `Ctrl + C`.

## Configurar los enlaces

Edita `js/config.js` y rellena:

- `instagram`: URL del perfil de Instagram.
- `tiktok`: URL del perfil de TikTok.
- `carta`: ya apunta a `carta.pdf`. Para actualizar la carta basta con
  reemplazar ese archivo por la nueva versión exportada de Canva (mismo nombre).

Mientras un enlace esté vacío, el botón muestra el aviso "¡Muy pronto!…".

## Colores y tipografías

| Uso            | Valor                         |
|----------------|-------------------------------|
| Fondo          | `#452959` (morado)            |
| Logo y botones | `#D6A74E` (dorado)            |
| Textos         | `#EDE9E6` (crema)             |
| Títulos        | Montserrat (Google Fonts)     |
| Botones        | Nunito Sans (Google Fonts)    |

## Publicar en internet

Al ser estática, se puede subir tal cual (la carpeta completa) a Netlify, Vercel,
Cloudflare Pages o GitHub Pages, sin configuración de build. Después hay que
apuntar el dominio (p. ej. el de Hervor) al servicio elegido.

## Mejoras recomendadas

- Sustituir `assets/img/logo-hervor.png` por el logo original en SVG o PNG de alta
  resolución exportado desde Canva (el actual se recortó de la imagen del diseño).
- Añadir una imagen para compartir en redes (`og:image`) de 1200×630 px.
