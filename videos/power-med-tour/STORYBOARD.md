---
format: 1920x1080
duration: 77s
message: "Sistema de gestión médica completo — turnos, pacientes y facturación — construido de punta a punta por un solo desarrollador"
arc: Demo Loop — hook → intro → demo por sección → credencial técnica
audience: reclutadores y clientes potenciales que evalúan al desarrollador
mode: collaborative
music: none
---

## Video direction

- **Palette** (frame.md): canvas #FFFFFF, ink/primary #0A0A0A, muted #737373, light #9A9A9A, cards rgba-ink 3-5%, borde 16%; verde positive #059669 SOLO para pills de estado; rojo negative solo si un dato lo exige. Nada de gradientes azul-violeta ni texturas ajenas.
- **Tipografía**: por rol de frame.md (display Space Grotesk, body Inter). Números tabulares en stats.
- **Motion grammar**: power3 long-tail siempre; nada bouncy. Video MUDO: el texto en pantalla ES el VO — cada título/callout/stat revela en su propio beat interno del frame, secuenciado hacia el back ~50%; nunca front-load. Screenshots SIEMPRE como cards flotantes (radius card-lg, borde sutil) — nunca full-bleed crudo, nunca chrome de browser.
- **Held frames**: Frame 2 (cierre del intro) y el read final de Frame 8 son breathers deliberados — quietud con subtle jitter como única vida. Frame 9 es el único con exit real (fade a canvas).
- **Negative list**: sin slideshow (dump inicial + freeze), sin screensaver (todo flotando), sin breathing, sin pan/push en back half, sin repeat/yoyo/random, sin cursor real de OS (cursor reconstruido sólo en Frame 4), sin alias de pago "molpo." visible en ningún encuadre.
- **Caption band**: sin captions, pero contenido igual en el top ~83%.

## Frame 1 — Hook

- scene: Tipografía grande centrada: "Turnos. Pacientes. Cobros." — cada palabra entra sola; remate "Una sola app."
- voiceover: ""
- duration: 6s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Value stacking (rule of three)
- beat: curiosity
- asset_candidates:

narrativeRole: Plantea en 3 golpes qué resuelve la app, en lenguaje de resultado — sin nombrar features ni al desarrollador todavía.
keyMessage: Todo el consultorio en una sola app.
On-screen (mudo): "Turnos." / "Pacientes." / "Cobros." → "Una sola app."

- blueprint: kinetic-type-beats (Reproduce)
- focal: (tipografía pura)

Scene 1 (0.0–1.4s): canvas blanco; "Turnos." entra con kinetic beat-slam (`kinetic-beat-slam`) centrado, display gigante, settle power3 — Centered, ~55% del frame.
Scene 2 (1.4–2.7s): hard-cut word-swap (`discrete-text-sequence`) a "Pacientes." — mismo slot, el corte es el beat.
Scene 3 (2.7–4.0s): swap a "Cobros." — tercer golpe del rule of three.
Scene 4 (4.0–6.0s): scale-swap (`scale-swap-transition`): la palabra saliente cede el centro y "Una sola app." aterriza con spring-pop entrance (`spring-pop-entrance`, settle suave sin overshoot) y sostiene el read — Centered, quieto.

## Frame 2 — Intro: Atriax

- scene: La landing real entra como pantalla flotante; el nombre "Atriax" y una línea de contexto arriba.
- voiceover: ""
- duration: 8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-intro.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: intrigue
- asset_candidates: assets/00-landing.png — hero de la landing pública de Atriax

narrativeRole: Nombra el producto y muestra que existe de verdad — sitio real, no mockup.
keyMessage: Atriax — gestión para consultorios, en producción.
On-screen: "Atriax" + "Gestión para consultorios médicos y estéticos".

- blueprint: device-surface-showcase (Adapt)
- focal: assets/00-landing.png
- roles: 00-landing = hero surface (card flotante)

Adapt: mantengo la superficie-héroe sostenida (signature); una sola pantalla estática con scroll interno en vez de ciclo de pantallas.
Scene 1 (0.0–2.0s): "Atriax" per-word staggered reveal (`dynamic-content-sequencing`) upper-third + subline "Gestión para consultorios médicos y estéticos" en muted — top 30%.
Scene 2 (2.0–5.0s): la landing sube desde abajo como card 3D levemente inclinada (`3d-page-scroll`); su contenido interno scrollea revelando el hero del sitio — asymmetric 60/40, 3 capas de profundidad (glow tenue detrás, card, titular).
Scene 3 (5.0–8.0s): la card se asienta plana con ambient glow bloom (`ambient-glow-bloom`) detrás; HELD read — subtle jitter (`sine-wave-loop` bajo) como única vida.

## Frame 3 — Dashboard

- scene: Screenshot real del dashboard como héroe; los 5 KPIs del strip se destacan uno a uno con callouts.
- voiceover: ""
- duration: 10s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/03-dashboard.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: clarity
- asset_candidates: assets/01-dashboard.png — Inicio con KPI strip, turnos de hoy y recordatorios

narrativeRole: Primera prueba de producto: el día del profesional resuelto en una pantalla.
keyMessage: El día entero de un vistazo: turnos, ingresos, deuda.
On-screen: "El día, de un vistazo" + callouts sobre KPIs reales ($28.000 ingresos, 4 turnos hoy).

- blueprint: device-surface-showcase (Adapt)
- focal: assets/01-dashboard.png
- roles: 01-dashboard = hero surface (card flotante)

Adapt: superficie sostenida + cámara que visita KPIs (sin ciclo de pantallas); signature = el surface-héroe presentado por la cámara.
Scene 1 (0.0–2.0s): título "El día, de un vistazo" per-word reveal upper-third; el dashboard entra desde abajo como card flotante — Centered, ~70% del frame.
Scene 2 (2.0–4.5s): zoom-to-target (`coordinate-target-zoom`) sobre el KPI strip; callout pill "4 turnos hoy" spring-pop junto al KPI real.
Scene 3 (4.5–7.0s): la cámara paneada (`viewport-change`) al bloque de ingresos; callouts "$28.000 hoy" y "deuda al día" revelan secuencialmente — cada uno en su beat.
Scene 4 (7.0–10.0s): pull-back al card completo (`multi-phase-camera`, fase única de salida de zoom), callouts persisten; hold quieto al final.

## Frame 4 — Turnos

- scene: Agenda en vista lista; un cursor simulado recorre y "abre" un turno; estados Confirmado/Pendiente/Completado como pills.
- voiceover: ""
- duration: 9s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/04-turnos.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: control
- asset_candidates: assets/02-turnos-lista.png — agenda con estados y filtros por fecha

narrativeRole: El flujo central del negocio: agendar y seguir turnos con estados claros.
keyMessage: Agenda con estados y seguimiento de pago por turno.
On-screen: "Agenda con estados" + pills Confirmado / Pendiente / Completado.

- blueprint: cursor-ui-demo (Adapt)
- focal: assets/02-turnos-lista.png
- roles: 02-turnos-lista = hero surface (card flotante)

Adapt: cursor reconstruido sobre screenshot estático (no UI viva); mantengo el signature = el cursor que conduce la mirada e induce cambio de estado visual (highlight de fila).
Scene 1 (0.0–2.0s): título "Agenda con estados" reveal; card de la agenda entra — Centered ~70%.
Scene 2 (2.0–4.0s): cursor reconstruido (`context-sensitive-cursor`) viaja a una fila de turno; click con ripple (`cursor-click-ripple`); la fila gana un highlight sweep (`css-marker-patterns`).
Scene 3 (4.0–6.5s): tres pills de estado (Confirmado verde / Pendiente / Completado) spring-pop secuenciales junto a la card, cada una en su beat — asymmetric 65/35.
Scene 4 (6.5–9.0s): hold; keyword glow (`asr-keyword-glow` adaptado a cue visual) sobre "estados" del título; quieto.

## Frame 5 — Pacientes

- scene: Cámara viaja del listado de pacientes a la ficha (master-detail): contacto, citas, tratamientos activos, historial médico.
- voiceover: ""
- duration: 10s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-pacientes.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: confidence
- asset_candidates: assets/04-pacientes.png — listado con badges de impago; assets/08-paciente-detalle.png — ficha completa con citas, tratamientos e historial

narrativeRole: Profundidad clínica: no es solo agenda, es historia clínica y ciclos de tratamiento por paciente.
keyMessage: Ficha completa: citas, tratamientos activos e historial médico.
On-screen: "Cada paciente, completo" — viaje listado → ficha.

- blueprint: camera-journey (Adapt, sub-shape A)
- focal: assets/08-paciente-detalle.png
- roles: 04-pacientes = supporting (estación de partida) · 08-paciente-detalle = hero (estación de llegada)

Adapt: roundtrip causa→efecto sobre dos screenshots como estaciones en un mundo continuo; signature = el viaje motivado de cámara (acción → consecuencia).
Scene 1 (0.0–2.5s): título "Cada paciente, completo"; card del listado de pacientes en station izquierda de un canvas ancho (`viewport-change` como mundo) — asymmetric 60/40.
Scene 2 (2.5–4.5s): highlight en la fila "Fernández, Lucía" (`css-marker-patterns` circle); la cámara swoopea en diagonal (`viewport-change` pan + focus-lock) hacia la ficha — motion-blur streak (`motion-blur-streak`) en el tramo rápido.
Scene 3 (4.5–8.0s): aterriza en la ficha; tres callouts revelan secuenciales en el back half: "Citas con estados", "Tratamientos activos", "Historial médico" — cada uno en su beat, spring-pop suave.
Scene 4 (8.0–10.0s): hold en la ficha con callouts asentados; quieto.

## Frame 6 — Tratamientos

- scene: Cards de tratamientos reales (nombre, precio, protocolo de sesiones) se autoensamblan en grilla.
- voiceover: ""
- duration: 8s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-tratamientos.html
- type: feature_showcase
- persuasion: Feature-to-benefit translation
- beat: ease
- asset_candidates: assets/05-tratamientos.png — catálogo con precios, costos y protocolo de sesiones

narrativeRole: El modelo de negocio del consultorio dentro de la app: precios, costos y ciclos de sesiones.
keyMessage: Tratamientos con protocolo: sesiones, frecuencia y precio.
On-screen: "Protocolos de tratamiento" + cards con datos reales del demo.

- blueprint: grid-card-assemble (Reproduce)
- focal: assets/05-tratamientos.png
- roles: 05-tratamientos = background (dim ~35%, contexto detrás de la grilla)

Reproduce: 4 cards de tratamiento REALES (Mesoterapia facial $45.000 · Limpieza profunda $28.000 · Rellenos ác. hialurónico $120.000 · Peeling químico $38.000, con sesiones/frecuencia) recreadas con tokens de frame.md, autoensamblándose.
Scene 1 (0.0–1.5s): título "Protocolos de tratamiento" reveal; screenshot difuminado al fondo (`depth-of-field-blur`, dim).
Scene 2 (1.5–5.0s): las 4 cards cascade staggered (`center-outward-expansion` hacia grilla 2×2), cada una aterriza en su beat con settle power3 — grid centrada, ~65% del frame, 3 capas.
Scene 3 (5.0–8.0s): en el back half los precios tick con value-scaled counter (`counting-dynamic-scale`) y una barra de sesiones se llena (`stat-bars-and-fills`); hold final quieto.

## Frame 7 — Deudas

- scene: Los KPIs financieros reales cuentan hacia arriba ($146.000 cobrado, $693.000 pendiente, 75.3% margen) sobre el dashboard de deudas.
- voiceover: ""
- duration: 10s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/07-deudas.html
- type: feature_showcase
- persuasion: Statistical proof
- beat: power
- asset_candidates: assets/06-deudas.png — dashboard de deudas con 7 KPIs y chart cobrado vs pendiente

narrativeRole: El diferencial: inteligencia financiera, no solo agenda — números que cuentan solos la historia.
keyMessage: Control financiero: cobrado, pendiente, margen — en vivo.
On-screen: count-ups de los KPIs + "Inteligencia financiera del consultorio".

- blueprint: dataviz-countup (Reproduce)
- focal: assets/06-deudas.png
- roles: 06-deudas = background (dim ~40% tras los stats)

Reproduce: los números son el héroe; slots = los KPIs reales del demo.
Scene 1 (0.0–2.0s): título "Inteligencia financiera del consultorio" reveal; el dashboard de deudas sube como card al fondo, dim.
Scene 2 (2.0–4.3s): "$146.000 · Total cobrado" count-up con escala creciente (`counting-dynamic-scale`) — station izquierda del triptych.
Scene 3 (4.3–6.6s): "$693.000 · Pendiente de cobro" count-up centro; barra de progreso se llena (`stat-bars-and-fills`).
Scene 4 (6.6–8.5s): "75.3% · Margen de ganancia" count-up derecha con ring fill; los tres stats quedan co-residentes — triptych, jerarquía por tamaño en el último.
Scene 5 (8.5–10.0s): hold; ambient glow (`ambient-glow-bloom`) tenue tras el margen; quieto.

## Frame 8 — Facturación

- scene: Pantalla de facturación con el total mensual calculado con cotización USD oficial en vivo; foco en el cálculo, NUNCA primer plano del alias de pago.
- voiceover: ""
- duration: 8s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/08-facturacion.html
- type: feature_showcase
- persuasion: Friction reduction
- beat: trust
- asset_candidates: assets/07-facturacion.png — facturación con cotización USD en vivo y desglose de costos (⚠ cubrir/evitar alias "molpo.")

narrativeRole: Detalle de ingeniería que demuestra oficio: integración de cotización de dólar en tiempo real.
keyMessage: Costos en USD convertidos con el dólar oficial del día.
On-screen: "Cotización en tiempo real" + destaque del cálculo USD→ARS.

- blueprint: device-surface-showcase (Adapt)
- focal: assets/07-facturacion.png
- roles: 07-facturacion = hero surface — ENCUADRE: sólo el tercio superior (bloque "Total a transferir" + cotización); el bloque del alias queda SIEMPRE fuera del crop.

Adapt: superficie sostenida con zoom a una región; signature = surface-héroe. El crop es obligatorio (privacidad).
Scene 1 (0.0–2.0s): título "Cotización del dólar, en tiempo real" reveal; card de facturación (crop superior) entra — Centered ~65%.
Scene 2 (2.0–4.5s): zoom-to-target (`coordinate-target-zoom`) sobre "USD 28 × $1.500 (dólar oficial)"; highlight sweep (`css-marker-patterns`) sobre la fórmula en su beat.
Scene 3 (4.5–6.5s): callout "consulta la cotización oficial del día" spring-pop; el total "$42.000" gana keyword glow en su beat.
Scene 4 (6.5–8.0s): HELD read — breather deliberado, subtle jitter only.

## Frame 9 — Outro: el desarrollador

- scene: "Atriax" anclado al centro; debajo cicla el stack (React · TypeScript · Node · PostgreSQL · Docker) y cierra en "Diseñado y desarrollado por Matías Maldonado".
- voiceover: ""
- duration: 8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/09-outro.html
- type: branding
- persuasion: Authority by association (credencial técnica)
- beat: confidence
- asset_candidates:

narrativeRole: El giro portfolio: todo lo anterior fue construido por una persona — nombre y stack como cierre.
keyMessage: Full-stack, de punta a punta, por Matías Maldonado.
On-screen: "Atriax" fijo + stack ciclando → "Diseñado y desarrollado por Matías Maldonado".

- blueprint: fixed-anchor-cycle (Reproduce)
- focal: (tipografía pura)

Reproduce: anchor inmóvil + slot que cicla; slots = wordmark y stack real.
Scene 1 (0.0–1.5s): "Atriax" spring-pop al centro exacto — el anchor entra UNA vez y no se mueve más — Centered, display grande.
Scene 2 (1.5–5.0s): debajo, in-place token cycle (`discrete-text-sequence`): React → TypeScript → Node.js → PostgreSQL → Docker, un token por beat, hard-cut swaps a cadencia pareja.
Scene 3 (5.0–7.0s): el ciclo limpia; "Diseñado y desarrollado por Matías Maldonado" per-word staggered reveal (`dynamic-content-sequencing`) en muted — el lockup completo asienta.
Scene 4 (7.0–8.0s): único exit real del video: fade suave del lockup a canvas blanco.
