# Atriax

## SaaS para la gestión integral de consultorios médicos

**Rol:** Desarrollo full stack end-to-end  
**Tipo de proyecto:** Producto SaaS multi-tenant  
**Período:** 2026  
**Plataformas:** Aplicación web responsive y API REST

## Descripción breve

Desarrollé Atriax, una plataforma SaaS que centraliza la operación diaria de
profesionales de la salud. La aplicación integra agenda, pacientes, historia
clínica, tratamientos, documentación de sesiones, cobranzas y comunicaciones
automáticas en una única experiencia web, adaptable tanto a escritorio como a
dispositivos móviles.

El proyecto abarcó todo el ciclo de producto: definición de flujos, diseño de
interfaz, modelado de datos, desarrollo frontend y backend, integraciones con
servicios externos, automatización de tareas y pruebas.

## El desafío

La gestión de un consultorio suele quedar distribuida entre calendarios,
planillas, mensajes de WhatsApp, correos y registros clínicos separados. Esto
genera trabajo duplicado, dificulta el seguimiento de cada paciente y reduce la
visibilidad sobre turnos, tratamientos y pagos pendientes.

El objetivo fue convertir esos procesos dispersos en un producto coherente,
seguro y fácil de usar durante la jornada de un profesional. La solución debía
resolver tanto las tareas clínicas como las administrativas, mantener aislada
la información de cada cliente y seguir funcionando correctamente ante fallas
de servicios externos.

## La solución

Atriax organiza el trabajo alrededor de tres áreas principales:

- **Agenda:** turnos en vista de lista o calendario semanal, estados de
  asistencia y pago, tratamientos asociados, documentación de la sesión y
  sincronización con Google Calendar.
- **Pacientes:** ficha unificada con datos de contacto, antecedentes,
  medicación, alergias, sesiones, tratamientos activos y registro fotográfico.
- **Gestión:** indicadores diarios, seguimiento de ciclos de tratamiento,
  cobranzas, planes de pago, historial de movimientos y administración de
  clientes desde un panel de superadministrador.

La interfaz fue diseñada con un enfoque responsive. En escritorio utiliza
paneles maestro-detalle para acelerar la navegación y, en pantallas pequeñas,
transforma esos mismos flujos en vistas de pantalla completa optimizadas para
uso táctil.

## Funcionalidades principales

### Dashboard operativo

Construí una pantalla de inicio que resume la jornada del profesional: turnos
del día, estados de confirmación, ingresos registrados, deuda pendiente y
alertas de seguimiento. El sistema calcula cuándo un paciente debería retomar
un tratamiento según su etapa inicial o de mantenimiento y evita alertas
innecesarias cuando ya existe un próximo turno.

### Agenda y turnos

La agenda permite crear, editar, confirmar, completar o cancelar turnos;
filtrarlos por fecha y estado; asociar tratamientos y registrar el estado de
pago desde la reserva. También permite crear un paciente sin abandonar el flujo
de asignación del turno y documentar la atención realizada.

### Historia clínica y tratamientos

Cada paciente dispone de una ficha con condiciones médicas, medicación,
alergias, notas, sesiones y evolución de tratamientos. Los protocolos admiten
frecuencias iniciales y de mantenimiento, cantidad de sesiones y costos. Las
fotografías clínicas se almacenan de forma privada en Amazon S3 mediante URLs
temporales firmadas.

### Cobranzas y seguimiento financiero

Implementé un módulo para registrar pagos, medios de cobro, deuda por paciente,
antigüedad de saldos y planes en cuotas. Los importes se almacenan como enteros
en centavos para evitar errores de precisión. El panel administrativo también
permite controlar el pago mensual de infraestructura de cada cliente.

### Comunicaciones automáticas

La aplicación envía confirmaciones y recordatorios por email y WhatsApp. Los
pacientes pueden confirmar o cancelar un turno desde el mensaje, y el
profesional recibe la actualización correspondiente. Los recordatorios se
procesan en segundo plano, evitan duplicados, respetan bajas de comunicación y
registran el resultado de cada envío.

### Asistente con lenguaje natural

Integré un asistente para planes avanzados que interpreta solicitudes en
lenguaje natural y las traduce en operaciones sobre turnos, pacientes, sesiones
y tratamientos. El flujo conserva contexto entre mensajes, solicita datos
faltantes, resuelve ambigüedades y exige confirmación antes de ejecutar acciones
destructivas.

### Gestión SaaS

La plataforma utiliza una arquitectura multi-tenant: cada consultorio trabaja
en un espacio de datos aislado. Incluye registro con verificación de email,
recuperación segura de contraseña, roles de profesional y superadministrador,
planes de uso y una integración de suscripciones con Mercado Pago.

## Cómo lo desarrollé

Diseñé el sistema como una aplicación full stack en TypeScript. El frontend se
construyó con React y componentes accesibles de shadcn/ui sobre Radix UI. La API
se implementó con Node.js y Express, separando las rutas HTTP de la lógica de
negocio mediante una capa de servicios. PostgreSQL actúa como fuente de verdad y
Drizzle ORM aporta consultas y migraciones tipadas.

La arquitectura general sigue este flujo:

```text
React + Vite
      |
      v
API REST con Express
      |
      v
Servicios de dominio
      |
      +----> PostgreSQL + Drizzle ORM
      +----> Workers, colas y tareas programadas
      +----> Google Calendar, WhatsApp, Resend, S3, Mercado Pago y OpenAI
```

Para las tareas que no debían bloquear la experiencia del usuario, incorporé
procesamiento asíncrono. La sincronización con Google Calendar utiliza una cola
persistente, prioridades, reintentos con espera exponencial y monitoreo de
errores. Los recordatorios, reinicios de límites y limpieza de archivos
pendientes se ejecutan mediante trabajos programados.

## Decisiones y desafíos técnicos

| Desafío | Implementación | Valor aportado |
| --- | --- | --- |
| Aislar datos de distintos consultorios | Identificador de tenant en el modelo, filtros por tenant en servicios y control de acceso por roles | Evita cruces de información entre clientes |
| Mantener sincronizados los calendarios | OAuth 2.0, tokens cifrados, cola persistente y reintentos con backoff | Tolera fallas temporales sin frenar la gestión de turnos |
| Proteger archivos clínicos | Carga y lectura directa con URLs firmadas de S3, rutas separadas por tenant y limpieza de cargas incompletas | Reduce la exposición de archivos y la carga sobre la API |
| Automatizar comunicaciones sin afectar operaciones críticas | Emails y plantillas de WhatsApp desacoplados, registro de entregas y control de duplicados | Un fallo de mensajería no impide crear o actualizar un turno |
| Mantener consistencia financiera | Importes en centavos, estados de pago tipados e historial de movimientos | Evita errores de redondeo y facilita auditoría |
| Adaptar flujos complejos a móviles | Diseño responsive, navegación maestro-detalle y overlays de pantalla completa | Permite trabajar desde el consultorio sin depender de una computadora |

## Seguridad y calidad

- Autenticación con JWT y contraseñas protegidas con bcrypt.
- Autorización basada en roles para rutas profesionales y administrativas.
- Verificación de email y recuperación de contraseña con tokens de un solo uso,
  expiración y almacenamiento mediante hash.
- Tokens de Google Calendar cifrados antes de persistirlos.
- Validación de entradas con Zod y manejo centralizado de errores.
- Pruebas unitarias, de integración y basadas en propiedades con Jest, Vitest,
  Testing Library, Supertest y fast-check.
- Entornos reproducibles con Docker Compose, migraciones versionadas, ESLint y
  Prettier.

## Stack tecnológico

**Frontend:** React 19, TypeScript, Vite, React Router, Tailwind CSS,
shadcn/ui, Radix UI, React Hook Form, Zod, TanStack Table, Recharts, Axios y
date-fns.

**Backend:** Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM, JWT, bcrypt,
Zod, Pino y node-cron.

**Integraciones:** Google Calendar API, WhatsApp Cloud API de Meta, Resend,
Amazon S3, Mercado Pago y OpenAI API.

**Calidad e infraestructura:** Jest, Vitest, Testing Library, Supertest,
fast-check, Docker, Docker Compose, ESLint y Prettier.

## Resultado

El resultado es un producto funcional que reúne procesos clínicos,
administrativos y financieros en una sola plataforma. Más allá de implementar
pantallas y endpoints, el desarrollo exigió modelar reglas reales de negocio,
coordinar integraciones asíncronas, proteger información sensible y sostener una
experiencia consistente en escritorio y móvil.

Este proyecto me permitió profundizar en arquitectura SaaS multi-tenant,
modelado de dominios complejos, diseño de interfaces orientadas a flujos de
trabajo, automatización, seguridad, observabilidad y pruebas de sistemas full
stack.

## Versión corta para una tarjeta de portfolio

**Atriax** es una plataforma SaaS para profesionales de la salud que centraliza
agenda, pacientes, historia clínica, tratamientos, cobranzas y comunicaciones.
Desarrollé el producto de extremo a extremo con React, TypeScript, Node.js,
Express y PostgreSQL, incluyendo arquitectura multi-tenant, sincronización con
Google Calendar, recordatorios por email y WhatsApp, archivos privados en S3,
suscripciones y un asistente basado en lenguaje natural.

