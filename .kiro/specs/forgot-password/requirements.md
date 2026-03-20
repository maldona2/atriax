# Requirements Document

## Introduction

Esta funcionalidad permite a los usuarios del panel de administración de Atriax recuperar el acceso a su cuenta cuando han olvidado su contraseña. El flujo consta de tres pasos: solicitud de recuperación desde la página de login, envío de un email con un enlace seguro de un solo uso, y un formulario para establecer una nueva contraseña. La UI está en español, coherente con el resto del panel.

## Glossary

- **Sistema**: La aplicación web Atriax (frontend React + backend Node.js).
- **Usuario**: Un profesional de salud estética registrado en el panel de administración.
- **Token_Recuperacion**: Un token criptográficamente seguro, de un solo uso y con expiración, generado para autorizar el restablecimiento de contraseña.
- **Pagina_Solicitud**: La página/formulario donde el Usuario introduce su email para solicitar el restablecimiento.
- **Pagina_Nueva_Contrasena**: La página/formulario donde el Usuario introduce y confirma su nueva contraseña tras hacer clic en el enlace del email.
- **Servicio_Email**: El servicio backend responsable de enviar emails transaccionales.
- **API_Auth**: El conjunto de endpoints del backend que gestionan autenticación y recuperación de contraseña.

---

## Requirements

### Requirement 1: Enlace "¿Olvidaste tu contraseña?" en la página de login

**User Story:** Como Usuario, quiero ver un enlace de recuperación de contraseña en la página de login, para poder iniciar el proceso de recuperación sin necesidad de contactar con soporte.

#### Acceptance Criteria

1. THE Sistema SHALL mostrar un enlace con el texto "¿Olvidaste tu contraseña?" en la página de login, visible debajo del campo de contraseña.
2. WHEN el Usuario hace clic en el enlace "¿Olvidaste tu contraseña?", THE Sistema SHALL navegar a la Pagina_Solicitud en la ruta `/forgot-password`.

---

### Requirement 2: Solicitud de restablecimiento de contraseña

**User Story:** Como Usuario, quiero introducir mi email para recibir un enlace de restablecimiento, para poder recuperar el acceso a mi cuenta de forma autónoma.

#### Acceptance Criteria

1. THE Pagina_Solicitud SHALL mostrar un campo de email y un botón de envío con el texto "Enviar enlace de recuperación".
2. WHEN el Usuario envía el formulario con un email en formato válido, THE API_Auth SHALL generar un Token_Recuperacion asociado al email y con una expiración de 1 hora.
3. WHEN el Usuario envía el formulario con un email en formato válido, THE Servicio_Email SHALL enviar un email al Usuario con un enlace que incluya el Token_Recuperacion.
4. WHEN el Usuario envía el formulario con un email que no corresponde a ninguna cuenta registrada, THE API_Auth SHALL responder con el mismo mensaje de confirmación que para un email válido, sin revelar si la cuenta existe.
5. WHEN el Usuario envía el formulario con un email en formato inválido, THE Pagina_Solicitud SHALL mostrar un mensaje de error de validación antes de realizar ninguna petición al servidor.
6. WHEN la petición al API_Auth se completa (con éxito o con email no encontrado), THE Pagina_Solicitud SHALL mostrar el mensaje: "Si el email está registrado, recibirás un enlace en breve."
7. WHILE la petición al API_Auth está en curso, THE Pagina_Solicitud SHALL deshabilitar el botón de envío para prevenir envíos duplicados.
8. THE Pagina_Solicitud SHALL mostrar un enlace "Volver al inicio de sesión" que navega a `/login`.

---

### Requirement 3: Generación y validación del Token de Recuperación

**User Story:** Como Usuario, quiero que el enlace de recuperación sea seguro y de un solo uso, para que nadie más pueda usarlo para acceder a mi cuenta.

#### Acceptance Criteria

1. THE API_Auth SHALL generar el Token_Recuperacion usando un generador criptográficamente seguro con una entropía mínima de 128 bits.
2. THE API_Auth SHALL almacenar el Token_Recuperacion en la base de datos en formato hash (no en texto plano), junto con el identificador del Usuario y la fecha de expiración.
3. WHEN se genera un nuevo Token_Recuperacion para un Usuario que ya tiene uno pendiente, THE API_Auth SHALL invalidar el token anterior antes de almacenar el nuevo.
4. WHEN el API_Auth recibe una petición de validación de token, THE API_Auth SHALL verificar que el Token_Recuperacion existe, no ha sido usado y no ha expirado.
5. IF el Token_Recuperacion ha expirado o no existe, THEN THE API_Auth SHALL responder con un código de error 400 y el mensaje "El enlace de recuperación no es válido o ha expirado."
6. WHEN el Token_Recuperacion es usado exitosamente para restablecer la contraseña, THE API_Auth SHALL marcarlo como usado para que no pueda reutilizarse.

---

### Requirement 4: Formulario de nueva contraseña

**User Story:** Como Usuario, quiero establecer una nueva contraseña segura tras hacer clic en el enlace del email, para recuperar el acceso a mi cuenta.

#### Acceptance Criteria

1. WHEN el Usuario accede a la ruta `/reset-password?token=<Token_Recuperacion>`, THE Sistema SHALL mostrar la Pagina_Nueva_Contrasena con dos campos: "Nueva contraseña" y "Confirmar contraseña".
2. WHEN el Usuario accede a `/reset-password` sin un token en la URL, THE Sistema SHALL redirigir al Usuario a `/forgot-password`.
3. WHEN el Usuario accede a `/reset-password?token=<Token_Recuperacion>`, THE Sistema SHALL validar el token contra el API_Auth antes de mostrar el formulario; IF el token es inválido o ha expirado, THEN THE Sistema SHALL mostrar el mensaje "El enlace de recuperación no es válido o ha expirado" con un enlace para solicitar uno nuevo.
4. WHEN el Usuario envía el formulario con una contraseña que tiene menos de 8 caracteres, THE Pagina_Nueva_Contrasena SHALL mostrar un error de validación sin realizar ninguna petición al servidor.
5. WHEN el Usuario envía el formulario con los campos "Nueva contraseña" y "Confirmar contraseña" con valores distintos, THE Pagina_Nueva_Contrasena SHALL mostrar el mensaje "Las contraseñas no coinciden" sin realizar ninguna petición al servidor.
6. WHEN el Usuario envía el formulario con una contraseña válida y ambos campos coinciden, THE API_Auth SHALL actualizar la contraseña del Usuario con el hash de la nueva contraseña y marcar el Token_Recuperacion como usado.
7. WHEN el API_Auth confirma el restablecimiento exitoso, THE Sistema SHALL mostrar el mensaje "Contraseña actualizada correctamente" y redirigir al Usuario a `/login` tras 3 segundos.
8. IF el API_Auth devuelve un error durante el restablecimiento, THEN THE Pagina_Nueva_Contrasena SHALL mostrar el mensaje de error recibido del servidor.
9. WHILE la petición de restablecimiento está en curso, THE Pagina_Nueva_Contrasena SHALL deshabilitar el botón de envío para prevenir envíos duplicados.

---

### Requirement 5: Email de restablecimiento de contraseña

**User Story:** Como Usuario, quiero recibir un email claro y seguro con el enlace de restablecimiento, para poder completar el proceso fácilmente.

#### Acceptance Criteria

1. THE Servicio_Email SHALL enviar el email de recuperación con un asunto en español: "Recuperación de contraseña - Atriax".
2. THE Servicio_Email SHALL incluir en el cuerpo del email el enlace de restablecimiento con el formato `<base_url>/reset-password?token=<Token_Recuperacion>`.
3. THE Servicio_Email SHALL incluir en el cuerpo del email la indicación de que el enlace expira en 1 hora.
4. IF el Servicio_Email no puede entregar el email por un error del proveedor, THEN THE API_Auth SHALL registrar el error en los logs del sistema sin exponer detalles al Usuario.

---

### Requirement 6: Seguridad y protección contra abuso

**User Story:** Como administrador del sistema, quiero que el flujo de recuperación esté protegido contra abuso, para evitar ataques de enumeración de usuarios y de fuerza bruta.

#### Acceptance Criteria

1. THE API_Auth SHALL aplicar rate limiting al endpoint de solicitud de recuperación, permitiendo un máximo de 5 peticiones por dirección IP en un intervalo de 15 minutos.
2. IF el rate limit es superado, THEN THE API_Auth SHALL responder con código HTTP 429 y el mensaje "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde."
3. THE API_Auth SHALL responder al endpoint de solicitud de recuperación con el mismo tiempo de respuesta independientemente de si el email existe o no, para prevenir ataques de temporización.
