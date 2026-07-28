# Cómo se hizo este video (y cómo replicarlo en otro proyecto)

Tour de producto mudo, 1:17, 1920×1080, hecho con **HyperFrames** (video renderizado desde HTML). Capturas reales de la app + tipografía cinética. Todo local, deterministicamente renderizable.

## Stack del pipeline

| Pieza | Herramienta |
|---|---|
| Framework de video | HyperFrames (`npx hyperframes`) |
| Workflow | skill `product-launch-video` (modo "mostrar tal cual" / site tour) |
| Captura de marca | `npx hyperframes capture <URL>` |
| Screenshots autenticados | browser headless (gstack `browse`) a 1920×1080 |
| Animación | GSAP, timeline pausada seek-safe (lo generan los frame workers) |
| Render | `npx hyperframes render` → MP4 local |

## Pasos

### 1. Brief (decidir antes de tocar nada)

Definir y anotar:
- **Mensaje**: la ÚNICA idea (acá: "sistema completo construido por un solo dev").
- **Qué mostrar**: lista de pantallas/secciones.
- **Destino → aspecto**: portfolio/YouTube = 16:9 (1920×1080); LinkedIn = 1:1; Reels = 9:16.
- **Duración**: 60–90s sweet spot; ~10s por sección mostrada.
- **Audio**: mudo / música / narración. Mudo = el texto en pantalla carga toda la explicación (1 línea corta por sección). Funciona bien en portfolio (autoplay muted).
- **Datos en pantalla**: NUNCA datos reales de usuarios. Armar entorno demo (paso 2).
- **Idioma** de títulos.

### 2. Entorno demo con datos ficticios

El paso más específico por proyecto. Acá:

```bash
# DB local aislada (docker-compose dev), NUNCA la de producción
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres
cd backend && DATABASE_URL='postgres://user:password@localhost:5433/mydb' npm run db:migrate
```

- Script one-off de seed con **datos ficticios creíbles** (nombres inventados, teléfonos `5555-xxxx`, emails `@example.com`): tenant demo + usuario demo + entidades suficientes para que cada pantalla se vea "viva" (listas pobladas, KPIs con números, estados variados).
- **Neutralizar claves salientes** al levantar el backend (SendGrid, WhatsApp, OpenAI, MercadoPago → valores dummy) para que nada real se envíe durante la captura.
- Gotcha común: `dotenv.config()` corre después de los imports ESM → si un módulo valida env en import, cargar el `.env` en el shell (`set -a && source .env && set +a`) con overrides encima.
- Revisar cada pantalla por **datos sensibles propios** (acá: alias de MercadoPago visible en Facturación → se excluyó por crop en el frame).

### 3. Proyecto HyperFrames + captura

```bash
npx hyperframes init "videos/<proyecto>-tour" --non-interactive --example=blank
cd videos/<proyecto>-tour
# escribir BRIEF.md (workflow, flow, storyboard, message, aspect, length, language...)
npx hyperframes capture "http://localhost:3000" -o ./capture   # landing pública → tokens de marca
```

Pantallas autenticadas (capture no loguea): browser headless a viewport 1920×1080, login demo, screenshot por sección → `capture/assets/`. Describir cada una en `capture/extracted/asset-descriptions.md` (el storyboard SOLO elige assets desde ahí). Convención: archivos planos en `capture/assets/`, referenciados como `assets/<basename>`.

Bonus: capturar es QA gratis — acá apareció un crash real (vista Calendario) que se fichó como bug aparte.

### 4. Design system (`frame.md`)

```bash
node <skill-dir>/product-launch-video/scripts/build-frame.mjs --preset <preset> --hyperframes .
```

- Preset elegido por fit con la marca (acá `blue-professional`: restraint ejecutivo). El script remixa los colores capturados encima del preset.
- **Revisar el remix a mano**: acá eligió rojo (venía de badges de error del sitio) como acento y hasta en `text-muted` → se corrigió a monocromo real de la marca. El acento auto-detectado puede ser un color de estado, no de marca.

### 5. Storyboard

`STORYBOARD.md` con frontmatter (`format`, `duration`, `message`, `music: none` para mudo) + un `## Frame N` por beat. Estructura que funcionó (arco Demo Loop):

1. **Hook** (6s) — tipografía cinética, rule of three de lo que resuelve. Sin producto aún.
2. **Intro** (8s) — nombre + landing real como card flotante. "Existe de verdad."
3–8. **Una sección por frame** (8–10s c/u) — screenshot real como card + callouts que revelan secuencialmente. Variar blueprint por frame (device-surface-showcase, cursor-ui-demo, camera-journey, grid-card-assemble, dataviz-countup) para que no se sienta template.
9. **Outro** (8s) — marca fija + stack tecnológico ciclando + crédito del dev. El giro portfolio.

Luego enriquecer cada frame con **secuencia time-coded** (`Scene 1 (0–2s): ...`) + bloque `## Video direction` (paleta, motion grammar, negative list). Reglas de oro del motion: `power3` siempre, nada bouncy, nunca front-load (revelar cada pieza en su beat, hacia el back 50%), quietud antes que motion malo, screenshots siempre como cards flotantes nunca full-bleed.

```bash
node <skill-dir>/scripts/stage-assets.mjs --storyboard ./STORYBOARD.md --hyperframes .
```

### 6. Build de frames (paralelo)

```bash
node <skill-dir>/scripts/frame-packets.mjs --project "$PWD" --storyboard "$PWD/STORYBOARD.md"
```

Genera un packet por frame + `_role.md` (contrato del worker). Despachar **un sub-agente por frame en paralelo**; cada uno escribe solo su `compositions/frames/NN-*.html`. 9 frames ≈ 5 min de wall-clock.

Post-build (lo que hubo que normalizar a mano):
- **Raíz uniforme**: cada frame necesita `<div id="root" data-duration data-composition-id data-width data-height>` como primer hijo del `<template>` — workers a veces ponen el `<style>` antes o los attrs en el `<template>`; el inyector de transiciones falla sin eso.
- **Fonts**: sin archivos de fuente en el proyecto, cada worker elige su fallback → unificar `font-family` en los 9 frames a un solo stack.

### 7. Ensamblado + checks + render

```bash
node <skill-dir>/scripts/assemble-index.mjs --storyboard ./STORYBOARD.md --hyperframes .
node <skill-dir>/scripts/transitions.mjs inject --storyboard ./STORYBOARD.md --hyperframes .
node <skill-dir>/scripts/transitions.mjs verify --storyboard ./STORYBOARD.md --index ./index.html
npx hyperframes lint      # 0 errores requerido
npx hyperframes check     # layout + motion + contraste (acá: 2 fixes de contraste 4.43→4.5)
npx hyperframes snapshot --at <puntos-medios>   # contact sheet → revisar a ojo
npx hyperframes preview   # Studio en localhost — revisión humana
npx hyperframes render --quality high --output renders/video.mp4
```

## Checklist de privacidad (app con datos de gente)

- [ ] DB demo aislada; producción jamás conectada
- [ ] Nombres/teléfonos/emails 100% inventados
- [ ] Claves de APIs salientes en dummy durante captura
- [ ] Revisar cada screenshot por datos propios (alias de pago, emails reales, tokens en pantalla)
- [ ] Si algo sensible es inevitable: crop físico en el frame (verificado en render), no "confiar en el encuadre"

## Qué cambiar por proyecto

| Variable | Este video | Tu próximo |
|---|---|---|
| Secciones | dashboard, turnos, pacientes, tratamientos, deudas, facturación | las tuyas (1 frame c/u) |
| Seed demo | pacientes/turnos ficticios | entidades de tu dominio |
| Preset | blue-professional → monocromo | por fit de marca (`frame-presets/`) |
| Hook | "Turnos. Pacientes. Cobros." | rule of three de TU dominio |
| Outro | stack + crédito dev | igual estructura, tu stack |
| Aspecto/duración | 16:9 · 77s | según destino |

Atajo: todo el pipeline lo orquesta `/hyperframes` → contesta el brief y ejecuta esto solo. Este MD sirve para entender qué decide cada paso y dónde meter mano.
