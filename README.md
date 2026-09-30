# RetroToons

Catalogo familiar de caricaturas clasicas, organizado por su canal original, pensado para
verse desde movil, tablet y el navegador de una Smart TV Samsung (Tizen), y compartido entre
varias casas detras de una clave familiar.

Monorepo con dos paquetes: `api/` (Node 22 + Express 4 + MySQL/MariaDB) y `web/` (Angular 22
PWA con Tailwind v4). En produccion, Express sirve tanto la API como la app Angular compilada
desde una unica URL.

## Aviso legal e importante

- La app maneja **solo metadata** de fuentes legales: [TVMaze](https://www.tvmaze.com/api) y
  [Jikan / MyAnimeList](https://jikan.moe/). Sus terminos exigen atribucion, que se muestra en
  el pie de pagina de la app y aqui mismo.
- El video es **siempre** de dominio publico (URLs que el propio dueño de la app aloja) o
  **embeds oficiales de YouTube**. Esta aplicacion **no descarga, aloja ni sirve** episodios
  con derechos de autor. Los campos `video_url` / `youtube_id` empiezan vacios y se rellenan a
  mano por quien despliegue la app.
- Fuera de alcance: apps nativas de Apple Watch / CarPlay (requieren entitlements de Apple y
  desarrollo nativo en iOS). En la web se usa la **Media Session API** como equivalente parcial
  de "Reproduciendo ahora" — ver la seccion [Media Session](#media-session-alcance-real) para
  su alcance real, que **no llega** a Apple Watch ni CarPlay desde una PWA.

## Stack

| Capa | Tecnologia |
|---|---|
| API | Node 22, Express 5 (ESM), `mysql2` (prepared statements) |
| Base de datos | MySQL 8 / MariaDB 11, InnoDB, `utf8mb4` |
| Validacion | zod |
| Seguridad | helmet, express-rate-limit, clave familiar con comparacion de tiempo constante |
| Frontend | Angular 22 standalone, signals, **zoneless**, application builder (esbuild/Vite) |
| Estilos | Tailwind CSS v4 (config CSS-first, sin `tailwind.config.js`) |
| Tests | Vitest + Supertest (API), Vitest (frontend). Sin Karma. |

## Puesta en marcha rapida (sin depender de internet)

```bash
npm run setup
cp api/.env.example api/.env      # define FAMILY_KEY (p.ej. "demo") y DATABASE_URL
npm run db:up                     # MariaDB dev + test en docker (docker-compose.yml)
npm run migrate                   # crea el esquema (idempotente)
npm run seed                      # datos de demo, sin tocar internet
npm run build && npm start        # http://localhost:3000  (clave: demo)
```

En desarrollo con recarga en caliente:

```bash
npm run dev   # api en :3000 (con --watch), web en :4200 (proxy /api -> :3000)
```

El `npm run seed` crea 6 series de ejemplo repartidas en varios canales, con 2-3 episodios
cada una. Los posters son SVGs generados localmente (data URI), no imagenes descargadas, para
que el catalogo se vea completo sin ninguna llamada de red. Algunos episodios traen un
`youtube_id` (video de Blender Foundation, Creative Commons, usado solo como marcador de
posicion) para mostrar el estado "Ver"; el resto queda "Sin video" a proposito para enseñar
ambos estados.

### Sin Docker disponible

Si no tienes Docker, puedes usar cualquier MySQL 8 / MariaDB 11 local: crea las bases
`retrotoons_dev` y `retrotoons_test` y apunta `DATABASE_URL` (o las variables `MYSQL*`) en
`api/.env` a esa instancia. El resto de los comandos (`migrate`, `seed`, `start`) funcionan
igual.

## Ingesta real de datos (opcional, necesita internet)

```bash
npm run ingesta            # series + temporadas + episodios completos (TVMaze / Jikan)
npm run ingesta:videos     # videos, solo de canales OFICIALES de YouTube (necesita YOUTUBE_API_KEY)
```

`npm run ingesta` puebla la base con el catalogo de `api/src/ingesta.js` (≈30 series de los 90:
Power Rangers, Franklin, Oso en la casa azul, Rocket Power, El autobus magico, El recreo, El mundo
de Bobby, Rugrats, Doug, Animaniacs, X-Men...). Cada serie se identifica por su id de TVMaze o por
nombre + año de estreno, y se pueden limitar temporadas (Power Rangers: solo Mighty Morphin, T1-T3).
Es **idempotente** y **nunca borra** videos ya asignados.

**Portadas**: no se guardan pósters externos. El frontend genera una portada original por serie
(`web/src/app/shared/portada.ts`: tele de los 90 + iniciales + color del canal + patron segun el
slug). Sin imagenes de terceros, sin marcas de agua ni copyright ajeno.

**Videos**: `npm run ingesta:videos` recorre las subidas del canal oficial declarado en `oficial`
y empareja por `SxxEyy` o por titulo exacto del episodio (si es ambiguo, no asigna). Descarta
clips, trailers y recopilaciones, y verifica que el propietario del video sea ese canal.

| Serie | Fuente oficial de episodios completos |
|---|---|
| Mighty Morphin Power Rangers | YouTube `@PowerRangersOfficial` |
| Franklin | YouTube `officialfranklin` |
| El autobus magico | YouTube `@TheMagicSchoolBusOfficial` |
| Rocket Power | Solo Paramount+ (sin canal oficial en YouTube) |
| El recreo, Oso en la casa azul | Solo Disney+ |
| El mundo de Bobby | Sin fuente oficial verificada |

### Canal "En español" (canales oficiales gratuitos)

Series que sus propietarios publican completas y gratis en YouTube. `npm run ingesta:videos` crea
la serie entera desde el canal (solo episodios completos por duracion; descarta recopilaciones,
directos y clips) y verifica que cada video sea del propio canal:

| Serie | Canal oficial | Idioma |
|---|---|---|
| Pocoyó | `@pocoyocapitulosenespanol` (Zinkia) | Español (España) |
| La abeja Maya (clásica) | `AbejaMayaOficial` (Studio 100) | Español |
| Érase una vez... el hombre / la vida | `@eraseunavezchannel` (Hello Maestro) | Español |
| Pingu | `@Pingu` | Sin diálogos |
| La Pantera Rosa | "Official Pink Panther Latinoamerica" | Latino / sin diálogos |
| Peppa Pig (2004) | "Peppa Pig Español - Canal Oficial" | Español |
| Caillou (1997) | `@CaillouEspanolCastellano` y "Caillou Español - WildBrain" | España / Latino |
| Totally Spies! (2001) | "Totally Spies! España" y "Tres Espías Sin Límite - Totally Spies" | España / Latino |
| Código Lyoko (2003) | `@CodeLyokoESP` ("Código Lyoko Castellano Oficial") | Español (España) |
| Oggy y las cucarachas (1998) | "Oggy y las cucarachas" (Xilam) | Sin diálogos |
| Barbapapá | `@Barbapapa-CanalOficial` | Español |

### Canal "Clásicos" (dominio publico, 1950+)

Cortos de Famous Studios que Wikipedia marca como **dominio publico en EE. UU.** (copyright no
renovado), en **version original en inglés** desde Internet Archive (`npm run ingesta`, sin API key):
13 de Popeye (1952-1957) y 2 de Casper (*Boo Moon*, *Spooking About Africa*). Los doblajes al
español **no** se incluyen: son obras derivadas con derechos propios en España y Latinoamerica.
La CSP permite `media-src https://archive.org https://*.archive.org` para reproducirlos.

Las series sin fuente oficial quedan con su lista de episodios completa pero sin video (se
muestran con candado). Puedes rellenar `youtube_id` a mano si encuentras un embed **oficial**.

## Estructura

```
retrotoons/
├── docker-compose.yml    MariaDB para dev (3306) y test (3307)
├── api/                  Express + mysql2
│   ├── src/
│   │   ├── server.js     arranca la API y sirve web/dist/web/browser
│   │   ├── app.js        helmet, CSP, rate limit, CORS, rutas, error handler
│   │   ├── auth.js       middleware de clave familiar (comparacion de tiempo constante)
│   │   ├── db.js         pool mysql2 (parsea DATABASE_URL o MYSQL*)
│   │   ├── repo.js       capa de datos: SQL parametrizado, upserts idempotentes
│   │   ├── validation.js esquemas zod para query/params/body
│   │   ├── routes/api.js endpoints REST
│   │   ├── utils.js      slugify, stripHtml, whitelisting de video
│   │   ├── schema.sql    esquema (idempotente via IF NOT EXISTS)
│   │   ├── migrate.js    aplica schema.sql
│   │   ├── seed.js       datos de demo offline
│   │   └── ingesta.js    ingesta real desde TVMaze / Jikan
│   └── test/              Vitest + Supertest (75 tests)
└── web/                   Angular 22 PWA
    ├── src/app/
    │   ├── api.service.ts        login/logout, canales, series, serie, episodios
    │   ├── auth.guard.ts         redirige a /login sin clave guardada
    │   ├── utils/                 channel-slug, player-nav, sw-cache-policy (con tests)
    │   ├── youtube-player.service.ts  IFrame Player API (onStateChange)
    │   └── pages/                 login, home, serie, reproductor
    └── public/
        ├── manifest.webmanifest
        ├── sw.js                  nunca cachea /api ni video
        └── fonts/                 Inter y Press Start 2P autohospedadas (OFL)
```

## Contrato de la API

Base `/api`. Errores con forma `{ "error": "..." }` (o `{ "ok": false }` para login) y codigo
adecuado (400 validacion, 401 sin autorizar, 404 no encontrado, 429 rate limit, 500 generico
sin stack trace).

| Metodo | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/health` | no | `{ status: 'ok' }` |
| POST | `/api/login` | no | body `{ key }` → `{ ok: true }` / 401 `{ ok: false }` |
| GET | `/api/canales` | si | lista de canales |
| GET | `/api/series?canal=&q=&limit=&offset=` | si | `limit` ≤ 200; `{ total, limit, offset, series }` |
| GET | `/api/series/:slug` | si | ficha + `total_episodios`; 404 si no existe |
| GET | `/api/series/:slug/episodios` | si | ordenados por temporada y numero |
| GET | `/api/episodios/:id` | si | incluye `video_url` / `youtube_id`; 404 si no existe |

## Seguridad

- **Clave familiar** (`FAMILY_KEY`): middleware exige la cabecera `x-family-key` en todas las
  rutas salvo `/health` y `/login`. La comparacion es de **tiempo constante sobre digests
  SHA-256 de longitud fija** (`node:crypto` `timingSafeEqual`), asi que nunca lanza por
  longitudes distintas ni filtra la longitud de la clave por timing. Si `FAMILY_KEY` no esta
  definida, la API queda en **modo abierto** (solo pensado para desarrollo local).
- **Rate limiting**: limite estricto en `/api/login` (anti fuerza bruta, responde 429) y uno
  general para el resto de `/api`. `app.set('trust proxy', 1)` esta activo para que el limite
  use la IP real detras del proxy de Railway (`X-Forwarded-For`) en vez de la IP del proxy.
- **Cabeceras de seguridad**: `helmet` con una CSP que solo permite `self`, el iframe de
  `https://www.youtube-nocookie.com` (+ `https://www.youtube.com` para la IFrame Player API),
  imagenes de los dominios de posters conocidos (TVMaze, MyAnimeList) y `data:` (los
  placeholders SVG del seed), y nada mas.
- **Validacion de entrada** con zod en query, params y body de cada ruta; entradas invalidas
  responden 400, nunca 500.
- **SQL**: exclusivamente `execute()` de `mysql2` con placeholders `?`. Ninguna consulta
  concatena strings de usuario.
- **Whitelisting de video**: `youtube_id` debe casar `^[A-Za-z0-9_-]{11}$`; `video_url` debe
  empezar por `https://`. Se valida al insertar/actualizar (`repo.upsertEpisodio`), tanto
  desde la ingesta como desde el seed.
- **Secretos**: solo por variables de entorno (`api/.env`, en `.gitignore`). Se provee
  `api/.env.example` sin valores reales.
- **CORS**: en produccion restringido al origen de `CORS_ORIGIN`; en local se permite
  `http://localhost:4200` (el puerto de `ng serve`).
- **Errores**: handler central que responde JSON generico y no filtra stacks ni rutas
  internas.
- **Sinopsis**: se guarda ya "strippeada" de HTML en la ingesta (`stripHtml`); el frontend la
  renderiza con interpolacion normal de Angular (equivalente a `textContent`), **nunca**
  `[innerHTML]` con contenido externo crudo.

> **Nota sobre la clave familiar unica:** una clave estatica compartida por todas las casas es
> comoda pero, si se filtra, compromete a todas y obliga a rotarla globalmente. Como mejora
> futura se podria (a) emitir un token de sesion firmado de corta duracion tras el login en
> vez de reenviar la clave cruda en cada peticion, o (b) soportar varias claves por casa
> guardando su hash en base de datos. No esta implementado en esta v1; se documenta aqui como
> decision consciente.

## UI: Volt UI + estetica 90s para peques

- Componentes de [Volt UI](https://github.com/Andersseen/volt-ui) en modo **copy-and-own** (`npx @voltui/cli add ...`), copiados en `web/src/app/ui`. Se usa este modo (y no el paquete `@voltui/components`) porque el paquete declara peer `@angular/core ^21.2` y el proyecto esta en Angular 22.
- Tema propio en `web/src/styles.scss`: tokens semanticos de Volt + preset de estilo `retro` (bordes gruesos, sombras duras) con paleta de caricaturas y texto oscuro sobre colores vivos (contraste >= 4.5:1).
- Variantes extra para ninos de 4+: botones `xl` / `icon-xl` (>= 80px), `ToggleGroup` con variante `channel` (mando a distancia por canal), input `xl`.
- UX: navegacion por iconos y colores, episodios como fichas numeradas, reproductor en una "tele" CRT con botones gigantes anterior/siguiente, y cierre de sesion protegido tras la "Zona de papas".
- Para anadir mas componentes: `cd web && npx @voltui/cli add <nombre>` (dependencias: `ng-primitives`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@angular/cdk`).

## Media Session (alcance real)

El reproductor `<video>` (episodios con `video_url`) configura
`navigator.mediaSession.metadata` (titulo del episodio, la serie como "artista" y el poster
como `artwork`) y `setActionHandler('nexttrack' / 'previoustrack')`. Esto alimenta el panel
"Reproduciendo ahora" del sistema operativo **donde el navegador lo soporta** — tipicamente
Android/Chrome y algunos navegadores de escritorio.

**No** esta garantizado en Apple Watch ni CarPlay desde una PWA (esos requieren apps nativas
de iOS con entitlements de Apple, fuera de alcance de este proyecto), y **no aplica** a los
episodios reproducidos via iframe de YouTube, que gestiona su propio "Reproduciendo ahora".

## Reproductor: anterior / siguiente y autoplay

La navegacion usa la lista de episodios de la serie (`utils/player-nav.ts`, con tests). El
autoplay al terminar un episodio usa **dos mecanismos distintos** porque `<video>` y el iframe
de YouTube no emiten el mismo evento:

- `<video>` HTML5 → evento nativo `ended`.
- YouTube (via `youtube-player.service.ts`, que carga la IFrame Player API) → **no emite
  `ended`**; se usa `onStateChange` y se detecta el estado `ENDED` (`0`).

## PWA

- `public/manifest.webmanifest`: nombre, `theme-color`, iconos 192/512 (incluye una variante
  `maskable`). Los iconos son un pictograma de TV retro generado localmente (sin usar ningun
  logo o imagen con derechos de autor).
- `public/sw.js`: cachea el shell de la app de forma progresiva (cache-first con
  actualizacion en segundo plano) pero **nunca** intercepta `/api/*` ni ficheros de video
  (`.mp4`, `.webm`, `.m3u8`) — la logica de esa decision vive tambien en
  `src/app/utils/sw-cache-policy.ts`, con tests, y se mantiene sincronizada a mano con
  `sw.js` (que es un script plano, servido tal cual, sin pasar por el bundler).
- Fuentes **autohospedadas** en `public/fonts/` (Inter variable + Press Start 2P, ambas
  bajo licencia SIL Open Font License — el `OFL.txt` de cada una queda junto al `.woff2`),
  declaradas con `@font-face` en `src/styles.scss`. Nada de `<link>` a Google Fonts: el shell
  funciona offline de verdad.
- Foco de teclado/mando grande y visible (`:focus-visible`), elementos nativamente enfocables
  (`<a>`/`<button>`), sin interacciones solo-hover, tipografia base de 16px, y
  `prefers-reduced-motion` respetado.
- `.browserslistrc` incluye versiones de Chrome/Firefox/Safari mas antiguas de lo habitual
  porque el WebView de Tizen (navegador de las Smart TV Samsung) va varias versiones por
  detras de los navegadores de escritorio — el build no debe emitir sintaxis que ese WebView
  no entienda.

## TDD

Cada pieza de comportamiento se escribio siguiendo red → green → refactor. La API corre sus
tests de integracion contra una **MariaDB de test real** (no hay SQLite `:memory:` para MySQL);
cada test aisla su estado con `TRUNCATE` en `beforeEach`. Los archivos de test del backend
corren en serie (`fileParallelism: false` en `vitest.config.js`) porque comparten la misma
base de datos de test.

```bash
npm test            # api + web
npm run test:watch  # api en modo watch
```

## CI

`.github/workflows/ci.yml` levanta un contenedor de servicio MariaDB, instala las
dependencias de `api/` y `web/`, aplica la migracion contra la base de test, corre ambas
suites y compila la web. El pull request no deberia poder mergearse si esta suite no esta en
verde (configura la proteccion de rama en GitHub para exigir este check).

## Despliegue en Cloudflare (Workers + Hyperdrive + Aiven, gratis)

API (Express 5) y web Angular en **una sola URL** de Cloudflare Workers. La base es una MySQL
**gratuita para siempre** de Aiven, a la que el Worker llega por **Hyperdrive**.

**Requisitos:** Node ≥ 22.22.3 (o 24), cuenta gratuita de Cloudflare y de Aiven.

### 1. Base de datos en Aiven (plan Free)
1. En la consola de Aiven: **Create service → MySQL → plan Free** (comprueba que el coste es 0 $).
2. Cuando este en *Running*, en **Overview** copia la **Service URI** y descarga el **CA certificate**.
3. Guarda el certificado como `api/ca.pem` y crea `api/.env` (ambos ignorados por git):
   ```
   DATABASE_URL=mysql://avnadmin:CONTRASEÑA@mysql-xxxx.aivencloud.com:PUERTO/defaultdb
   DB_SSL_CA=./ca.pem
   FAMILY_KEY=la-clave-familiar
   YOUTUBE_API_KEY=            # opcional, para ingesta:videos
   ```
4. Crea las tablas y carga el catalogo desde tu ordenador:
   ```bash
   npm run migrate --prefix api
   npm run ingesta --prefix api          # series, episodios y clasicos de dominio publico
   npm run ingesta:videos --prefix api   # opcional: episodios de canales oficiales
   ```

### 2. Hyperdrive
```bash
cd api
npx wrangler login
npx wrangler hyperdrive create retrotoons-db --connection-string="mysql://avnadmin:CONTRASEÑA@mysql-xxxx.aivencloud.com:PUERTO/defaultdb"
```
Copia el `id` que devuelve en `api/wrangler.jsonc` (`"id": "PON_AQUI_EL_ID_DE_HYPERDRIVE"`).

### 3. Secreto y despliegue
```bash
npx wrangler secret put FAMILY_KEY     # escribe la clave familiar
npm run cf:deploy                      # compila Angular y despliega el Worker
```
Wrangler te dara la URL `https://retrotoons.<tu-subdominio>.workers.dev`.

### Probar el Worker en local
```bash
cd api
printf 'FAMILY_KEY=demo\n' > .dev.vars
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=mysql://retrotoons:retrotoons@127.0.0.1:3306/retrotoons_dev
npm run build --prefix ../web && npm run cf:dev
```

**Como funciona:** `api/src/worker.js` es la entrada en Workers; la web la sirve `assets` y solo
`/api/*` llega a Express. Cada peticion abre su propio pool contra Hyperdrive (`disableEval`,
exigido por Workers) y lo cierra al terminar. Fuera de Workers (`npm start`, scripts, tests) se
usa el pool normal, con SSL si hay `DB_SSL_CA`. Los contadores de `express-rate-limit` viven en
memoria de cada instancia: suficiente para uso familiar, no es un limite global exacto.

## Despliegue (Railway)

Un solo servicio web + un servicio MySQL/MariaDB gestionado por Railway (Railway se encarga de
persistencia y backups; no hace falta un Volume para la base de datos).

- **Build**: `cd web && npm install && npm run build && cd ../api && npm install`
- **Start**: `cd api && npm start`
- **Variables**: `FAMILY_KEY`, y `DATABASE_URL` (o `MYSQLHOST` / `MYSQLPORT` / `MYSQLUSER` /
  `MYSQLPASSWORD` / `MYSQLDATABASE`, que Railway expone automaticamente al enlazar el servicio
  MySQL). `PORT` lo asigna Railway.
- **Al desplegar**: corre `npm run migrate` (en el deploy o al iniciar el server) y, una vez,
  `npm run ingesta` desde el propio servidor si quieres datos reales en vez de los de demo.
- **Healthcheck** de Railway apuntando a `/api/health`.
- La URL publica es la que se comparte con la familia; entran con la clave configurada en
  `FAMILY_KEY`.

## Atribucion

Metadata de series y episodios cortesia de [TVMaze](https://www.tvmaze.com/api) y
[Jikan / MyAnimeList](https://jikan.moe/). RetroToons no esta afiliado a ninguno de los dos
servicios; se usan sus APIs publicas respetando sus terminos de uso, incluida esta atribucion.

Tipografias [Inter](https://github.com/rsms/inter) y
[Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p), ambas bajo la
SIL Open Font License 1.1 (ver `web/public/fonts/*/OFL.txt`).
