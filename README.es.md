<img src="assets/georgie.gif" alt="avatar animado de georgie" width=15%>

🇬🇧 [English](README.md) · 🇮🇹 [Italiano](README.it.md) · 🇪🇸 Español

# georgie

una aplicación web para gestionar nuestra biblioteca física de casa — explorar, catalogar, prestar e intercambiar los libros de nuestros estantes.

**georgie** era el apodo familiar de jorge luis borges, heredado del lado inglés de su familia. antes de ser el escritor que imaginó el paraíso como una especie de biblioteca, fue un niño llamado georgie que creció recorriendo la biblioteca de su padre en buenos aires — el lugar que mitificaría por el resto de su vida, y al que finalmente regresaría como director de la biblioteca nacional de argentina. este proyecto toma prestado su apodo para una biblioteca mucho más pequeña: la de casa.

> en vivo en [georgie.leandroestrella.com](https://georgie.leandroestrella.com/)

## ¿cómo funciona?

el catálogo vive en una pequeña base de datos detrás de un backend que responde en una fracción de segundo. una google sheet sigue siendo una copia completa y editable, mantenida en sincronía en los dos sentidos: un cambio hecho en la app llega a la hoja unos segundos después, y una edición hecha en la hoja llega a la app la próxima vez que alguien la abre (o enseguida, desde el menú "sync" de la hoja). una app web estática lee y muestra el catálogo públicamente; los admin inician sesión con google para hacer cambios.

```mermaid
%{init: {'theme': 'dark'}}%
flowchart LR
    V[visitante] -->|navega, busca, filtra| SPA[app web georgie]
    A[admin] -->|inicio de sesión con google| SPA
    A -.->|escanea código de barras / busca isbn| SPA
    SPA -->|lecturas, y escrituras con una sesión| API[backend: cloudflare worker]
    API --> DB[(base de datos)]
    API <-->|sincronización, en los dos sentidos| SHEET[(google sheet privada)]
    A -.->|ediciones en bloque| SHEET
    SPA -->|metadatos| EXT[google books / open library]
    SPA -->|portadas| COV[tu host / open library / amazon]
```

## funcionalidades

- 📚 catálogo público, de solo lectura — búsqueda instantánea; filtra por zona, tema, autor, propietario, idioma, leído por y estado; ordena por título, autor o año; vistas de tarjetas y de tabla, ambas responsive hasta el teléfono
- 🔎 detalles del libro obtenidos de la web por isbn (google books → open library), completando solo los campos vacíos; búsqueda por título y autor con selección de candidatos para libros sin isbn
- 📷 **escaneo de código de barras** — apunta la cámara del teléfono al código de barras de la contraportada (el ean-13 *es* el isbn) para buscar un libro; nativo en android, con un decodificador que se carga bajo demanda en ios
- 🖼 portadas con una cadena de respaldo: url guardada → open library → amazon por isbn-10 → un marcador de posición teñido según la zona; los admin pueden fijar la portada mostrada — o tomar una foto del libro — en su propio host para que nunca se pierda
- ✏️ inicio de sesión admin para añadir, editar, archivar (eliminación suave, con una vista de archivados + restauración) y prestar libros
- 🧹 un filtro "por completar" (año faltante, `circa`, sin portada, sin idioma original) — la herramienta para terminar el catálogo desde el estante
- 🤝 seguimiento de préstamos — presta un libro (quién lo tiene + fecha), márcalo como devuelto; un flujo de intercambio por etapas (ofrecido → confirmado → en tránsito → recibido) para libros intercambiados en plataformas de intercambio, que vincula el libro saliente con su reemplazo entrante
- 🗂 categorías guiadas por la propia hoja: zonas (con sus propios colores, y emoji o imágenes como marcadores) que agrupan temas, reflejando los estantes físicos; las insignias de propietario y lector también vienen de la hoja
- 🌍 interfaz en english, italiano y español (los nombres de zonas/temas/idiomas y las descripciones de zonas y temas también se traducen)
- 🪪 ids legibles con formato de número de catálogo (`ORW-198-1950`), generados una sola vez e inmutables
- 📊 una página de **estadísticas** solo para admin — libros por zona (con el desglose de los temas de cada zona), por idioma, en idioma original vs. traducidos, y estadísticas de lectura por usuario; cada dato enlaza a la vista filtrada correspondiente del catálogo
- 🕘 un **registro de actividad** solo para admin — cada alta, edición, archivado, restauración, préstamo y devolución, del más reciente al más antiguo, con quién lo hizo, qué cambió, y un enlace al libro
- 📖 una página **acerca de** dentro de la app — el readme del proyecto, mostrada desde el avatar de georgie — con un pie de página que enlaza al código fuente y al autor
- 🗄️ copias de seguridad diarias de toda la hoja, obtenidas por un cron de cPanel mediante una cuenta de servicio de Google y exportadas a XLSX, protegidas por un `.htaccess` que deniega todo acceso — la rotación mantiene las últimas 14 diarias más 6 mensuales (opcional, configuración autoalojada)

## stack tecnológico

- [vite](https://vitejs.dev/) + [react](https://react.dev/) + [typescript](https://www.typescriptlang.org/) — frontend estático
- [tailwind css](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — estilos y componentes
- [react-router](https://reactrouter.com/) — enrutamiento del lado del cliente
- [react-i18next](https://react.i18next.com/) — internacionalización (english / italiano / español)
- [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) — escaneo de códigos de barras, con el `BarcodeDetector` nativo del navegador cuando está disponible
- [pomuku](https://github.com/leandroestrella/pomuku) — los paquetes compartidos sobre los que está construida georgie: componentes y tema, inicio de sesión, cliente de datos, traducciones, y el núcleo del backend
- [hono](https://hono.dev) sobre [cloudflare workers](https://workers.cloudflare.com/) + [d1](https://developers.cloudflare.com/d1/) — la api de backend y su base de datos (alcanza con el plan gratuito)
- [google identity services](https://developers.google.com/identity) — inicio de sesión admin
- [google sheets](https://www.google.com/sheets/about/) — la copia editable de la base de datos, mantenida en sincronía en los dos sentidos; un pequeño [apps script](https://developers.google.com/apps-script) añade a la hoja el menú "sync"
- [ftp-deploy-action](https://github.com/SamKirkland/FTP-Deploy-Action) — despliega a cpanel en cada push a `master`
- php — dos pequeños scripts de cpanel: subida de portadas y la copia de seguridad diaria de la hoja (ver [cpanel/README.md](cpanel/README.md), [docs/backups.md](docs/backups.md)); nada más en el stack usa php

## estructura del repositorio

```
web/          la spa (vite + react)
server/       el backend: un cloudflare worker con su base de datos, mantenido en sincronía con la hoja
apps-script/  el script de la hoja: su menú "sync" (y el backend anterior, conservado por un tiempo como respaldo)
cpanel/       php opcional: alojamiento de portadas y el script cron de copia de seguridad de la hoja
docs/         guías para quien gestiona el catálogo (ids de libros, marcadores de la hoja, traducciones)
assets/       material gráfico de la marca
```

## ejecuta tu propia instancia

georgie es una plantilla para cualquiera que quiera catalogar sus propios estantes:

1. copia la plantilla de google sheet — una pestaña `Catalog` con las columnas de los libros, una pestaña `Zones` que define tus categorías, una pestaña `Lists` para propietarios/idiomas, y una pestaña `Users` con quién puede hacer cambios (los encabezados de columna exactos están en [docs/sheet-setup.md](docs/sheet-setup.md)). mantenla **privada** (la app la lee a través del backend, así que nunca necesita compartirse por enlace)
2. crea un google oauth client id (aplicación web) para el botón de inicio de sesión; añade el origen de tu sitio a sus authorized javascript origins
3. despliega el backend — un cloudflare worker con una base de datos d1, conectado a tu hoja mediante una service account de google — siguiendo [server/README.md](server/README.md). su primer "sync now" importa tu hoja
4. copia `web/.env.example` a `web/.env.local` y completa `VITE_API_URL` (la dirección de tu worker) y `VITE_GOOGLE_CLIENT_ID` — ambos son públicos, así que también pueden vivir en los secrets del repositorio de github para la acción de despliegue
5. `npm install` en `server/` y en `web/` (la app web importa el esquema del backend), luego `npm run build` en `web/`, y aloja la carpeta `dist/` donde sea que tengas hosting estático (se incluye un `.htaccess` para el enrutamiento spa + cabeceras básicas para apache/cpanel)
6. *(opcional)* para permitir que los admin guarden portadas en tu propio host, copia [`cpanel/upload-cover.php`](cpanel/upload-cover.php) en el servidor y dale al worker su dirección y el secreto — ver [cpanel/README.md](cpanel/README.md)
7. *(opcional)* para copias de seguridad diarias de la hoja, copia [`cpanel/backup/run-backup.php`](cpanel/backup/run-backup.php) en el servidor y añade un Cron Job de cPanel — ver [docs/backups.md](docs/backups.md)

ambos valores de configuración son seguros de publicar (el client id de oauth es público por diseño, y cada escritura está protegida del lado del servidor: necesita la sesión de alguien que esté en la pestaña `Users`) — ningún secreto llega jamás al repositorio.

## guías para quien gestiona el catálogo

las guías del día a día para gestionar tu catálogo viven en [`docs/`](docs/):

- [configuración de la hoja](docs/sheet-setup.md) — el esquema exacto de columnas de `Catalog` / `Zones` / `Lists`
- [ids de los libros](docs/book-ids.md) — cómo se generan los ids con formato de número de catálogo, añadir libros directamente en la hoja, y el raro caso de regeneración manual
- [marcadores](docs/markers.md) — las insignias de propietario/lector/zona guiadas por columnas de la hoja
- [traducciones](docs/translations.md) — traducir nombres y descripciones de zonas/temas, y nombres de idiomas
- [alojamiento de portadas](cpanel/README.md) — el endpoint opcional para alojar portadas en tu propio servidor
- [copias de seguridad de la hoja](docs/backups.md) — el cron job opcional de copia de seguridad diaria

## desarrollo

el trabajo ocurre en la rama `develop`; el merge a `master` dispara la build y el despliegue ftp a cpanel vía github actions.

```bash
cd server
npm install
npm test        # todo el backend sobre una base de datos local, con una hoja mantenida en memoria

cd ../web
npm install
npm run dev     # funciona con datos simulados hasta que se configure VITE_API_URL — no necesita backend
npm test        # vitest (el cliente de la api, filtros, validación, metadatos)
npm run build   # verificación de tipos + build de producción
```

el modelo de datos y sus reglas (columnas, validación, el id con formato de número de catálogo) están escritos una sola vez, en `server/src/schema.ts`, e importados por la app web — así que `server/` tiene que estar instalado para que `web/` compile. la lógica pura se mantiene independiente del framework para poder probarla sin una hoja en vivo.

## licencia

[apache 2.0](LICENSE)
