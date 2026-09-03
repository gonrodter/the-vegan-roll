# The Vegan Roll — web 2.0

Sitio estático (HTML + CSS + JS sin dependencias) para The Vegan Roll, sushi 100% vegetal en Madrid.
Dirección de arte inspirada en la referencia solicitada (chamako.es): tipografía serif a gran escala,
fondo papel, animaciones ligadas al scroll — todo reconstruido con el branding de The Vegan Roll
(verde #048D4B, negro, logo triangular).

## Estructura

```
index.html      Home: hero, manifiesto, palabras gigantes, galería, localización
                (la home cierra en Localización → pie, sin banda intermedia)
carta.html      Carta completa por secciones + alérgenos
nosotros.html   Historia de Javier y del proyecto
reserva.html    Formulario de reserva (envía a /api/reserva)
api/reserva.js  Función serverless de Vercel: valida y manda la solicitud por email
assets/css/style.css
assets/js/main.js
assets/img/     Fotos originales (descargadas de theveganroll.com)
assets/img/w/   Versiones WebP a 480 / 800 / 1024 / 1280 px que sirve el sitio
assets/img/og.jpg  Imagen 1200x630 para redes sociales
assets/logo/    Logo en negro y en blanco
```

### Imágenes

El HTML no apunta a los JPEG originales: cada `<img>` lleva `srcset` con las tres
versiones WebP de `assets/img/w/` y un `sizes` acorde a su hueco en el diseño.
Los originales se conservan como fuente. Para regenerarlas tras cambiar una foto:

```bash
for f in assets/img/*.jpg assets/img/*.jpeg; do
  n=$(basename "${f%.*}")
  cwebp -q 78 -resize 480  0 -m 6 "$f" -o "assets/img/w/$n-480.webp"
  cwebp -q 72 -resize 800  0 -m 6 "$f" -o "assets/img/w/$n-800.webp"
  cwebp -q 68 -resize 1024 0 -m 6 "$f" -o "assets/img/w/$n-1024.webp"
  cwebp -q 64 -resize 1280 0 -m 6 "$f" -o "assets/img/w/$n-1280.webp"
done
```

La foto del hero es la imagen LCP de la home. Tres cosas tienen que seguir cuadrando
entre sí o se descarga de más (o dos veces):

1. El `imagesrcset`/`imagesizes` del `<link rel="preload">` del `<head>`.
2. El `srcset`/`sizes` del `<img>`.
3. El ancho real que le da el CSS (`86vw` en móvil, `84vw` hasta 1080px,
   `min(58vw, 900px)` arriba).

Además el hero **no** lleva `decoding="async"`: en la imagen LCP retrasa la pintura.
Y `.hero__media` tiene un color de fondo con la media de la foto (`#55552a` para la
actual), para que el hueco no sea un rectángulo de papel mientras carga. Si se cambia
la foto del hero hay que recalcular ese color.

### Cortinillas sobre foto

`[data-anim="mask"]` abre la imagen con un `clip-path`. El reveal espera a que la foto
esté **decodificada** (`img.decode()`, con tope de 3 s por si falla) antes de arrancar:
si no, la animación se consumía en blanco y la imagen aparecía de golpe al final. Los
huecos de foto (`[data-anim="mask"]`, `.bleed`, `.gallery__item`, `.place__map`) llevan
además un fondo `--paper-2` para que la espera se vea como un bloque y no como un vacío.

## Ejecutar en local

```bash
python3 -m http.server 4322
# http://localhost:4322
```

No hay build ni dependencias. Despliegue previsto en **Vercel**: basta con importar el repo o hacer
`vercel --prod` desde esta carpeta; no necesita configuración porque es HTML estático en la raíz. Única dependencia externa: la fuente EB Garamond de Google Fonts.

## Animaciones (assets/js/main.js)

- **Hero**: la foto escala con el scroll, sin filtros de color; el titular usa
  `mix-blend-mode: difference`.
- **Palabras gigantes** (`data-word`): cada letra entra con desenfoque según el progreso del bloque.
- **Galería horizontal** (`data-gallery`): se desplaza en X mientras la sección cruza la pantalla.
- **Parallax** (`data-parallax="0.12"`): valor = intensidad.
- **Reveals** (`data-anim`, `data-anim="mask"`, `data-anim-delay="1..3"`): IntersectionObserver.
- **Marquees** (`data-marquee="0.45"`): bucle continuo + empuje del scroll.
- Todo se desactiva con `prefers-reduced-motion`.

## Móvil (≤900px)

La versión móvil no es la de escritorio encogida; el bloque `MÓVIL` al final de
`style.css` la reescribe. Lo que cambia y por qué:

- **Hero**: la foto arranca pequeña y crece con el scroll, igual que en escritorio,
  pero colocada de modo que el titular la cruce y se vea el `mix-blend-mode`.
- **Rendimiento del bucle de scroll**: en escritorio hay un `requestAnimationFrame`
  continuo (lo piden las marquesinas). En móvil las marquesinas pasan a animación CSS
  y el bucle solo se despierta con el evento `scroll`: sin scroll, no hay trabajo.
- **Grano**: deja de animarse. Repintar una capa fija a pantalla completa con
  `mix-blend-mode` 60 veces por segundo hunde los FPS y la batería en móvil.
- **Parallax**: desactivado. En pantalla estrecha descolocaba las fotos.
- **Galería**: deja de moverla el scroll de la página; se pasa con el dedo
  (`scroll-snap`). Las bandas horizontales llevan `overflow-y: hidden` para que no
  arrastren también en vertical.
- **Palabras gigantes**: el bloque pasa de `175vh` a altura natural. Antes dos de
  esos bloques ocupaban un tercio de la home casi en blanco.
- **Manifiesto**: se alinea a la izquierda en vez de a la derecha.
- **Ritmo vertical**: los paddings de sección de escritorio están en `vh`, así que en
  un móvil alto dejaban 200-270px entre secciones. Recortados a la mitad larga.
- **Menú**: bloqueo de scroll de fondo con `position: fixed` (lo único que funciona
  en iOS Safari) y el `rAF` del movimiento de la imagen ya no corre eternamente.
- **Formularios**: inputs a 16px, que es el umbral por debajo del cual iOS hace zoom
  al enfocar un campo.
- **Carta**: el índice pegajoso se pega justo bajo la cabecera usando `--hh` (alto
  real medido por JS) y sube con ella cuando se esconde.

## Metadatos y redes sociales

Cada página lleva `canonical`, Open Graph y Twitter Card, con `assets/img/og.jpg`
(1200x630) como imagen de previsualización.

⚠️ Las URL absolutas de esas etiquetas están escritas contra **`https://theveganroll.com`**,
que **todavía apunta a la web antigua**. Mientras el sitio viva en una URL de Vercel hay que
cambiarlas, o al compartir el enlace la tarjeta buscará la imagen en el dominio viejo y saldrá
rota. Los rastreadores de WhatsApp, Instagram y Facebook no ejecutan JavaScript, así que esto
no se puede resolver en tiempo de ejecución: tiene que estar en el HTML.

Para cambiarlo de golpe en los 7 HTML:

```bash
ANTIGUO="https://theveganroll.com"
NUEVO="https://tu-proyecto.vercel.app"
sed -i '' "s|$ANTIGUO|$NUEVO|g" *.html
```

Afecta a `canonical`, `og:url`, `og:image` y `twitter:image`.

## Wordmark

`.wordmark` es centrado por defecto (Nosotros, Reserva). La home usa la variante
`.wordmark--left`: alineada a la izquierda con el vertical japonés apoyado en el
costado derecho del logotipo. Si se añade cualquier otro texto dentro de la sección,
va debajo del logotipo — el auto-placement de la rejilla lo mandaría a la celda libre
de la derecha, que fue lo que descolocó el «desde 2022» de Nosotros.

## Reseñas (home)

Sección estática entre el logotipo gigante y Localización. Nota media a gran escala,
enlace al perfil de Google y tres reseñas, cada una abierta por sus estrellas (el
mismo recurso que los números de Nosotros: un elemento grande arriba, sin filetes).

Los datos y las tres citas se tomaron del perfil de Google del restaurante el
**3 de septiembre de 2026**: 4,9 sobre 1.397 reseñas. Las citas van tal cual las
escribieron sus autores. Si se actualizan, hay que tocar tres cosas en el mismo
bloque de `index.html`: la nota, el número de reseñas y los tres textos.

El enlace «verlas todas» usa el CID del negocio
(`https://maps.google.com/?cid=71564320683409384`), que aterriza directamente en su
ficha y no depende de que la búsqueda por nombre siga funcionando.

Si más adelante se quieren en vivo, la vía es la Places API de Google (`Place Details`
devuelve hasta 5 reseñas) desde una función serverless que cachee la respuesta —
la clave no puede ir en el cliente y la API se cobra por petición.

## Manifiesto (home)

Bloque de texto en mayúsculas alineado a la derecha y apoyado en el margen derecho,
partido en cuatro párrafos. En móvil (≤900px) pasa a alinearse a la izquierda: con
una columna estrecha el borde dentado a la izquierda cuesta de leer.

Acompañando al texto por la izquierda hay una columna vertical en japonés
(`.manifesto__ghost`, 魚のない寿司 — «sushi sin pescado») que asoma por debajo de la
foto a sangre de la sección anterior. Va con `z-index: -1`, y para que funcione
`.manifesto` **no puede tener `z-index` propio**: si lo tuviera crearía contexto de
apilamiento y la columna se quedaría dentro, por delante de la foto en vez de detrás.
Oculta en móvil (≤900px), donde no hay hueco a la izquierda que llenar.

Antes era un triángulo hecho con dos cuñas flotantes y `shape-outside`. Se quitó:
además de ser poco legible, arrastraba dos problemas que conviene no repetir si
alguien lo reintenta —un flotante solo afecta a las líneas que van **después** de él
(el lado derecho estaba en un `::after` y nunca recortaba nada), y sin `flow-root` las
cuñas se escapaban del bloque y estrujaban la sección siguiente.

## Datos del negocio usados

- Dirección: **Caños del Peral, 9 (Ópera), Madrid** — la que figura en el Instagram actual.
  ⚠️ La web antigua sigue mostrando "C. de Segovia, 15". Confirmar cuál es la buena y, si hiciera
  falta, buscar y reemplazar en los 4 HTML.
- Horarios: comidas J–D 13:00–16:00 · cenas toda la semana 19:30–23:00 (de la web antigua).
- Teléfonos: 685 607 037 / 825 853 761. WhatsApp: `https://wa.me/34685607037`.
- Carta y precios: copiados de theveganroll.com/restaurant (revisar antes de publicar).
- Email de contacto: **theveganroll@gmail.com**.
- El enlace de Glovo apunta a glovoapp.com: sustituir por la URL del restaurante.

## Formulario de reserva

`reserva.html` hace POST en JSON a `/api/reserva`, una función serverless de Vercel que envía la solicitud
por correo con [Resend](https://resend.com). Variables de entorno a configurar en el proyecto de Vercel:

| Variable | Ejemplo |
| --- | --- |
| `RESEND_API_KEY` | `re_xxx` |
| `RESERVAS_TO` | `theveganroll@gmail.com` |
| `RESERVAS_FROM` | `The Vegan Roll <reservas@theveganroll.com>` (dominio verificado en Resend) |

Sin esas variables la función responde 500 y el formulario muestra el teléfono como alternativa. Incluye
trampa antispam (campo oculto `empresa`) y validación de campos obligatorios en servidor.
En local (`python3 -m http.server`) la función no existe: para probarla, `vercel dev`.

## Páginas legales

`privacidad.html`, `aviso-legal.html` y `cookies.html`, enlazadas desde el footer y con `noindex`.
Partiendo de las de la web antigua:

- **Privacidad**: la anterior era la plantilla por defecto de WordPress (comentarios, Gravatar, cookies de
  login) y no describía nada de lo que realmente pasa. Reescrita para este sitio: sin servidor propio,
  reservas por WhatsApp, alergias como dato de salud, Google Fonts, derechos RGPD y AEPD.
- **Aviso legal**: parte de sus «Condiciones generales» (uso del sitio, enlaces, modificaciones, contacto) y
  añade los datos identificativos que exige la LSSI-CE, propiedad intelectual, reservas/no-shows, precios y
  alérgenos, y ley y jurisdicción.
- **Cookies**: no existía. La web no instala ninguna cookie, así que el documento lo declara y explica los
  servicios externos (Google Fonts, enlaces salientes) y cómo gestionarlas en el navegador.
- La **política de devoluciones** de la web antigua (plantilla de WooCommerce: 30 días, embalaje original,
  reembolsos a tarjeta) no se ha portado: no hay tienda online y no aplica a un restaurante.

⚠️ Faltan por rellenar en los tres documentos: **razón social y NIF/CIF** (marcados como `[pendiente]`).
El alojamiento ya está declarado: **Vercel Inc.** (EE. UU., transferencia internacional cubierta por el
capítulo V del RGPD). No son textos revisados por un abogado: conviene que los valide una asesoría
antes de publicar.

## Pendiente / mejoras fáciles

- Fotos: se han reutilizado las del sitio antiguo. Con material nuevo (Instagram/sesión propia)
  la home gana mucho; basta con reemplazar los archivos de `assets/img/`.
- Página en inglés (la web antigua tenía "Restaurant EN") y blog, si se quieren mantener.
- Textos legales (privacidad, aviso legal, cookies) enlazados pero aún sin página.
