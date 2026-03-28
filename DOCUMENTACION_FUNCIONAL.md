# Documentación funcional del proyecto

## 1. Descripción general del sistema
Este es un sistema web para gestionar pasantías laborales. Sirve para conectar a estudiantes y egresados con empresas que ofrecen oportunidades de trabajo o prácticas profesionales.

El objetivo principal es facilitar el proceso de búsqueda y aplicación a empleos, especialmente para jóvenes que están terminando sus estudios o recién graduados.

Los usuarios principales son:
- Estudiantes y egresados que buscan oportunidades laborales
- Empresas que necesitan contratar personal
- Administradores que supervisan el sistema

## 2. Cómo está compuesto el proyecto
El proyecto tiene dos partes principales: frontend y backend.

El frontend es la parte visible del sistema, la interfaz web que ven los usuarios. Está hecho con React, una herramienta para crear páginas web interactivas.

El backend es la parte invisible, el "motor" que maneja la lógica y los datos. Está hecho con Node.js y Express, programas que permiten crear servidores web.

Estas dos partes se conectan a través de una API (interfaz de programación de aplicaciones), que es como un puente que permite que el frontend pida información al backend.

Los datos se guardan en una base de datos PostgreSQL, que es un sistema para almacenar información de forma organizada.

## 3. Flujo general del sistema
El sistema funciona de la siguiente manera:

1. Un usuario abre la página web en su navegador
2. El frontend muestra la interfaz según el tipo de usuario (estudiante, empresa o administrador)
3. Cuando el usuario hace algo (como ver ofertas o aplicar a un trabajo), el frontend envía una solicitud al backend
4. El backend recibe la solicitud y hace lo necesario:
   - Verifica que el usuario tenga permisos
   - Consulta o modifica datos en la base de datos si es necesario
   - Envía una respuesta de vuelta
5. El frontend recibe la respuesta y actualiza lo que se muestra en la pantalla

Por ejemplo, cuando un estudiante aplica a una oferta de trabajo:
- El estudiante hace clic en "Aplicar" en la página de detalles de la oferta
- El frontend envía los datos de la aplicación al backend
- El backend crea un registro de la postulación en la base de datos
- El backend envía una notificación automática a la empresa
- El frontend muestra un mensaje de confirmación al estudiante

## 4. Requerimientos funcionales
Los requerimientos funcionales describen qué debe hacer el sistema. Basados en las funciones reales implementadas:

1. El sistema debe permitir a los usuarios registrarse con diferentes roles (estudiante, egresado, empresa, administrador)
2. El sistema debe permitir iniciar sesión con email y contraseña
3. El sistema debe permitir recuperar la contraseña olvidada mediante email
4. El sistema debe mostrar ofertas de trabajo disponibles con filtros por área, ciudad y modalidad
5. El sistema debe permitir a los estudiantes ver los detalles completos de una oferta de trabajo
6. El sistema debe permitir a los estudiantes aplicar a ofertas de trabajo con una carta de presentación opcional
7. El sistema debe permitir a los estudiantes ver el estado de sus postulaciones
8. El sistema debe permitir a los estudiantes subir y actualizar su currículum vitae
9. El sistema debe permitir a los estudiantes editar su perfil profesional
10. El sistema debe permitir a las empresas crear nuevas ofertas de trabajo
11. El sistema debe permitir a las empresas ver todas sus ofertas publicadas
12. El sistema debe permitir a las empresas ver los postulantes a sus ofertas
13. El sistema debe permitir a las empresas cambiar el estado de las postulaciones (preseleccionado, entrevista, etc.)
14. El sistema debe permitir a los administradores aprobar o rechazar empresas nuevas
15. El sistema debe permitir a los administradores moderar ofertas de trabajo antes de publicarlas
16. El sistema debe mostrar estadísticas del sistema a los administradores
17. El sistema debe enviar notificaciones automáticas cuando cambian los estados de las postulaciones
18. El sistema debe validar que no se puedan hacer postulaciones duplicadas a la misma oferta

## 5. Requerimientos no funcionales
Los requerimientos no funcionales describen cómo debe funcionar el sistema, no qué debe hacer:

1. El sistema debe ser fácil de usar, con una interfaz clara y navegación intuitiva
2. El sistema debe ser seguro, usando autenticación con tokens JWT que expiran en 7 días
3. El sistema debe responder rápidamente a las acciones del usuario
4. El sistema debe validar los datos de entrada para evitar errores
5. El sistema debe manejar errores de forma amigable, mostrando mensajes claros al usuario
6. El sistema debe ser compatible con navegadores web modernos
7. El sistema debe organizar el código de forma clara y mantenible
8. El sistema debe proteger la información sensible con encriptación de contraseñas
9. El sistema debe permitir subir archivos de currículum de hasta 5MB
10. El sistema debe funcionar tanto en desarrollo como en producción

## 6. Casos de uso

### Caso de uso 1: Aplicar a una oferta de trabajo
- **Actor principal**: Estudiante o egresado
- **Descripción**: Un estudiante encuentra una oferta interesante y decide aplicar
- **Precondición**: El estudiante debe estar registrado y tener sesión iniciada
- **Flujo principal**:
  1. El estudiante navega a la página de ofertas
  2. Filtra las ofertas según sus preferencias
  3. Hace clic en una oferta para ver los detalles
  4. Lee la descripción completa y decide aplicar
  5. Opcionalmente escribe una carta de presentación
  6. Hace clic en "Aplicar"
  7. El sistema confirma que la aplicación fue enviada
- **Resultado esperado**: La postulación queda registrada y la empresa recibe una notificación

### Caso de uso 2: Crear una oferta de trabajo
- **Actor principal**: Empresa
- **Descripción**: Una empresa quiere publicar una nueva oportunidad laboral
- **Precondición**: La empresa debe estar registrada, aprobada por el administrador y tener sesión iniciada
- **Flujo principal**:
  1. La empresa va al panel principal
  2. Hace clic en "Crear nueva oferta"
  3. Completa el formulario con título, descripción, requisitos, etc.
  4. Selecciona la modalidad de trabajo y ubicación
  5. Establece la fecha límite de aplicación
  6. Hace clic en "Publicar"
  7. El sistema guarda la oferta como pendiente de moderación
- **Resultado esperado**: La oferta queda guardada y espera aprobación del administrador

### Caso de uso 3: Moderar ofertas pendientes
- **Actor principal**: Administrador
- **Descripción**: Un administrador revisa ofertas nuevas antes de publicarlas
- **Precondición**: El administrador debe tener sesión iniciada
- **Flujo principal**:
  1. El administrador va al panel de administración
  2. Ve la lista de ofertas pendientes
  3. Revisa el contenido de cada oferta
  4. Decide aprobar o rechazar cada una
  5. Hace clic en el botón correspondiente
  6. El sistema actualiza el estado de la oferta
- **Resultado esperado**: Las ofertas aprobadas se vuelven visibles para los estudiantes

### Caso de uso 4: Gestionar postulaciones
- **Actor principal**: Empresa
- **Descripción**: Una empresa revisa los candidatos que aplicaron a sus ofertas
- **Precondición**: La empresa debe tener ofertas publicadas y postulaciones
- **Flujo principal**:
  1. La empresa va al panel principal
  2. Ve la lista de sus ofertas con número de postulantes
  3. Hace clic en "Ver postulantes" de una oferta
  4. Revisa la información de cada candidato
  5. Descarga currículums si están disponibles
  6. Cambia el estado de las postulaciones según corresponda
  7. El sistema notifica automáticamente a los candidatos
- **Resultado esperado**: Los candidatos reciben actualizaciones sobre su postulación

## 7. Módulos o secciones principales del sistema

### Autenticación
Esta sección maneja el registro, inicio de sesión y recuperación de contraseñas. Incluye validación de usuarios y control de acceso según roles.

### Gestión de ofertas de trabajo
Permite crear, ver y moderar ofertas laborales. Incluye filtros de búsqueda y detalles completos de cada oferta.

### Gestión de postulaciones
Maneja el proceso de aplicación a ofertas, seguimiento de estados y comunicación entre estudiantes y empresas.

### Perfiles de usuario
Permite a estudiantes y empresas gestionar su información personal y profesional, incluyendo subida de currículums.

### Panel de administración
Ofrece herramientas para administradores para aprobar empresas, moderar contenido y ver estadísticas del sistema.

### Notificaciones
Sistema automático que informa a los usuarios sobre cambios en sus postulaciones o nuevas oportunidades.

## 8. Tecnologías usadas y por qué
- **React**: Para crear la interfaz web interactiva. Facilita actualizar la pantalla sin recargar la página completa.
- **Node.js y Express**: Para crear el servidor backend. Manejan las solicitudes del frontend y la lógica del negocio.
- **PostgreSQL**: Base de datos para guardar toda la información. Es confiable y maneja bien relaciones complejas entre datos.
- **Sequelize**: Herramienta que simplifica trabajar con la base de datos desde el código.
- **JWT**: Para autenticación segura. Crea "tokens" que verifican la identidad del usuario sin guardar contraseñas.
- **Axios**: Para enviar solicitudes entre frontend y backend. Hace más fácil comunicar las dos partes.
- **Vite**: Para desarrollo rápido. Permite ver cambios en el código inmediatamente sin reiniciar el servidor.

## 9. Resumen
"Este proyecto es un sistema web para conectar estudiantes con empresas para pasantías. Tiene dos partes principales: la interfaz que ven los usuarios, hecha con React, y el servidor que maneja los datos, hecho con Node.js.

Los estudiantes pueden buscar ofertas de trabajo, aplicar con su currículum y seguir el estado de sus postulaciones. Las empresas pueden publicar ofertas y revisar candidatos. Los administradores aprueban empresas nuevas y moderan las ofertas antes de publicarlas.

Usamos una base de datos PostgreSQL para guardar toda la información, y el sistema incluye autenticación segura con tokens. Todo está organizado en módulos claros: autenticación, ofertas, postulaciones, perfiles y administración.

El flujo básico es: el estudiante ve ofertas, aplica, la empresa revisa postulantes, cambia estados, y el sistema notifica automáticamente. Es como un LinkedIn simplificado pero específico para pasantías."

## 10. Conclusión
Este sistema es una plataforma completa para gestionar el proceso de pasantías entre estudiantes del Instituto Tecnológico Beltrán y empresas locales. Está organizado en frontend y backend para separar claramente la interfaz de usuario de la lógica de datos.

La estructura tiene sentido porque permite que diferentes tipos de usuarios (estudiantes, empresas, administradores) tengan experiencias personalizadas mientras comparten la misma base de datos. Las tecnologías elegidas son modernas y apropiadas para un sistema web escalable y seguro.

El proyecto demuestra cómo se puede crear una aplicación web completa que resuelve un problema real en el mundo laboral de los estudiantes.