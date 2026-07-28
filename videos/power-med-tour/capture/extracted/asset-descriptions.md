# Asset Descriptions

⚠️  GEMINI_API_KEY not set — descriptions below are catalog-derived (alt text, headings, section context, filename) instead of Vision-generated. To get richer Vision descriptions on the next capture, set GEMINI_API_KEY (or GOOGLE_API_KEY) and re-run.

The `logo-<hash>.svg` filename prefix is a structural hint (DOM said this SVG was inside a `<header>`, home-link `<a>`, or had an aria-label matching the page brand). To pick the actual brand logo without Vision, open the `logo-*` candidates in a previewer or rasterize them with `sharp` before referencing — composing a fake logo ships off-brand in the final video.

- svgs/svg-08a6422e-10.svg — svg 08a6422e 10
- svgs/svg-08a6422e-11.svg — svg 08a6422e 11
- svgs/svg-08a6422e-12.svg — svg 08a6422e 12
- svgs/svg-08a6422e-2.svg — svg 08a6422e 2
- svgs/svg-08a6422e-3.svg — svg 08a6422e 3
- svgs/svg-08a6422e-4.svg — svg 08a6422e 4
- svgs/svg-08a6422e-5.svg — svg 08a6422e 5
- svgs/svg-08a6422e-6.svg — svg 08a6422e 6
- svgs/svg-08a6422e-7.svg — svg 08a6422e 7
- svgs/svg-08a6422e-8.svg — svg 08a6422e 8
- svgs/svg-08a6422e-9.svg — svg 08a6422e 9
- svgs/svg-08a6422e.svg — svg 08a6422e
- svgs/svg-1546f0fe.svg — svg 1546f0fe
- svgs/svg-37e66d8b.svg — svg 37e66d8b
- svgs/svg-40717089.svg — svg 40717089
- svgs/svg-41479408.svg — svg 41479408
- svgs/svg-6bd33dcf.svg — svg 6bd33dcf
- svgs/svg-72323eb5.svg — svg 72323eb5
- svgs/svg-7b06e952.svg — svg 7b06e952
- svgs/svg-7bfeb65f.svg — svg 7bfeb65f
- svgs/svg-80749435.svg — svg 80749435
- svgs/svg-8642d0ec.svg — svg 8642d0ec
- svgs/svg-ac388294.svg — svg ac388294
- svgs/svg-ba9b8f27.svg — svg ba9b8f27
- svgs/svg-cfcb43e8.svg — svg cfcb43e8
- svgs/svg-e99c7622.svg — svg e99c7622
- svgs/svg-eb817a4d-2.svg — svg eb817a4d 2
- svgs/svg-eb817a4d-3.svg — svg eb817a4d 3
- svgs/svg-eb817a4d.svg — svg eb817a4d
- svgs/svg-fc5fdc06.svg — svg fc5fdc06

## App screenshots (authenticated, demo data — captured via headless browser at 1920x1080)

- `assets/app/01-dashboard.png` — Inicio/dashboard: KPI strip (turnos hoy, confirmados, pendientes, ingresos del día $28.000, deuda pendiente $693.000), lista "Turnos de hoy" con estados Confirmado/Pendiente, panel recordatorios de ciclo. Sidebar completa visible.
- `assets/app/02-turnos-lista.png` — Turnos, vista lista: agenda con turnos agrupados por día, estados (Completado/Confirmado/Pendiente), botones Lista/Calendario/Nuevo, filtro por rango de fechas.
- `assets/app/04-pacientes.png` — Pacientes: listado con búsqueda, badge de impagos por paciente (ej. "2 impagos · $240000.00"), botón Nuevo.
- `assets/app/05-tratamientos.png` — Tratamientos: catálogo con precios, costos y protocolo de sesiones (frecuencia inicial/mantenimiento).
- `assets/app/06-deudas.png` — Dashboard de Deudas: 7 KPI cards (total cobrado, pendiente de cobro, deuda promedio, tasa de recuperación, costos, ingreso real, margen 75.3%), tabs Vista General/Antigüedad/Planes de Pago/Historial, chart Resumen Financiero cobrado vs pendiente.
- `assets/app/07-facturacion.png` — Facturación: total mensual a transferir en ARS calculado con cotización USD oficial en vivo, desglose de costos de infraestructura (hosting, WhatsApp). ⚠ Muestra alias de pago real "molpo." — NO mostrar en primer plano en el video o cubrirlo.
- `assets/app/08-paciente-detalle.png` — Ficha de paciente (master-detail): contacto, citas con estados, registro de tratamientos activos con sesiones, historial médico (condiciones/medicamentos/alergias). Todos los datos son demo ficticios.

Nota: la vista Calendario de turnos crashea (bug fichado aparte) — no hay screenshot.
Todo dato visible es demo/ficticio (tenant consultorio-demo), salvo el alias de facturación señalado.
- `assets/app/00-landing.png` — Landing pública de Atriax (hero): titular, CTA de registro, primer viewport del sitio de marketing.
