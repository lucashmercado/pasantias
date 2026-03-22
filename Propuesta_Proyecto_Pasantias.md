# PRÁCTICAS PROFESIONALIZANTES III – PROPUESTA DE ALTERNATIVA DE PROYECTO

---

## Conformación del Equipo

| Apellido y Nombre   |
|---------------------|
| Vera Emanuel        |
| Leiva Marlene       |
| Mercado Lucas       |
| Pedrazo Melisa      |

**Código de equipo:** A

---

## 1. Denominación del Proyecto

**Sistema de Gestión de Pasantías**

---

## 2. Descripción del Proyecto (Síntesis)

El presente proyecto consiste en el diseño y desarrollo de un **Sistema de Gestión de Pasantías** orientado a centralizar y digitalizar el proceso de vinculación entre estudiantes, egresados, empresas e instituciones educativas. La plataforma busca resolver la problemática actual de la dispersión de información y la falta de herramientas específicas para gestionar oportunidades laborales de nivel iniciático y pasantías de manera estructurada, transparente y eficiente.

El sistema permite a los **alumnos y egresados** crear perfiles profesionales detallados, cargar su currículum vitae, explorar ofertas laborales publicadas, postularse a las mismas y realizar un seguimiento del estado de sus postulaciones. Por otro lado, las **empresas** tienen la posibilidad de registrarse en la plataforma, publicar ofertas de pasantías o empleos, visualizar los perfiles de los postulantes y gestionar el proceso de selección de manera integral desde un panel específico.

La **institución educativa** actúa como administradora del sistema, contando con herramientas para moderar las empresas habilitadas, gestionar las publicaciones, supervisar el proceso de vinculación y acceder a estadísticas e informes sobre la empleabilidad de sus egresados y el impacto de las pasantías gestionadas a través de la plataforma.

Como diferencial innovador, el sistema incorpora un **módulo de recomendaciones automáticas** que, mediante el análisis del perfil académico y profesional de cada usuario (habilidades, área de estudio, experiencia previa), sugiere de forma inteligente las ofertas laborales más afines a su perfil, mejorando la relevancia de las búsquedas y reduciendo los tiempos de inserción laboral. Asimismo, la plataforma ofrece un **panel de estadísticas de empleabilidad** en tiempo real, permitiendo a la institución identificar tendencias del mercado, áreas con mayor demanda y el nivel de absorción laboral de sus graduados.

---

## 3. Fundamentación / Problemática

### 3.1 Situación Actual

La búsqueda de pasantías y primeras oportunidades laborales por parte de estudiantes y egresados de instituciones de educación técnica y superior se realiza, en la gran mayoría de los casos, a través de canales informales y dispersos. Grupos de mensajería instantánea, redes sociales de uso general, tablones de anuncios físicos y correos electrónicos sin estructura son los medios más utilizados. Esta modalidad genera una serie de inconvenientes que afectan a todos los actores involucrados:

- **Dispersión de la información:** las ofertas laborales no se concentran en un espacio único y accesible, lo que dificulta su descubrimiento oportuno.
- **Falta de seguimiento formal:** no existe un mecanismo estructurado que permita a los postulantes conocer el estado de sus candidaturas, ni a las empresas gestionar los procesos de selección de forma ordenada.
- **Desvinculación institucional:** la institución educativa carece de herramientas para supervisar y promover activamente la inserción laboral de sus egresados, lo que impide cuantificar el impacto real de sus programas formativos.
- **Ineficiencia en el proceso de selección:** las empresas que buscan perfiles técnicos específicos no disponen de una vía directa y confiable para acceder a candidatos formados por instituciones reconocidas.

### 3.2 Justificación del Proyecto

El desarrollo de un sistema centralizado de gestión de pasantías se presenta como una solución natural, eficiente y escalable a los problemas descritos. La digitalización del proceso de vinculación entre oferta y demanda laboral no solo mejora la experiencia de los usuarios directos, sino que también fortalece el rol de las instituciones educativas como actores clave en el ecosistema productivo local y regional.

---

## 4. Objetivos

### 4.1 Objetivo General

Desarrollar una plataforma web integral que gestione de manera centralizada, eficiente y transparente el proceso de búsqueda, postulación y seguimiento de pasantías y oportunidades de primera inserción laboral, vinculando a alumnos, egresados, empresas e institución educativa en un ecosistema digital unificado.

### 4.2 Objetivos Específicos

1. Implementar un sistema de registro y autenticación seguro para los distintos tipos de usuario (alumno/egresado, empresa, administrador).
2. Desarrollar un módulo de gestión de perfiles profesionales que permita a los usuarios cargar y actualizar su información académica, habilidades y currículum vitae.
3. Crear un módulo de publicación y búsqueda de ofertas laborales con filtros avanzados que faciliten la búsqueda de oportunidades afines al perfil del usuario.
4. Implementar un sistema de postulaciones con seguimiento de estados que brinde transparencia y trazabilidad al proceso de selección.
5. Desarrollar un panel de administración institucional con herramientas de moderación, supervisión y generación de reportes.
6. Incorporar un módulo de recomendaciones automáticas de ofertas basado en el perfil del usuario, como diferencial innovador del sistema.
7. Diseñar e implementar un panel de estadísticas de empleabilidad que brinde información estratégica a la institución sobre la inserción laboral de sus egresados.

---

## 5. Alcance del Sistema

### 5.1 Alcance Funcional

El sistema cubrirá los siguientes procesos:

- Registro, autenticación y gestión de perfiles de todos los tipos de usuario.
- Publicación, búsqueda y filtrado de ofertas laborales.
- Postulación a ofertas y seguimiento de estados.
- Gestión del proceso de selección por parte de las empresas.
- Administración y moderación institucional.
- Recomendaciones automáticas y estadísticas de empleabilidad.

### 5.2 Fuera del Alcance

Los siguientes aspectos quedan explícitamente fuera del alcance del presente proyecto:

- Gestión de contratos o documentación legal de las pasantías.
- Procesamiento de pagos o remuneraciones.
- Integración con sistemas de terceros (ERP, RRHH externos).
- Aplicación móvil nativa (iOS/Android); el sistema será responsive pero exclusivamente web.

---

## 6. Detalle de Funcionalidades

El sistema contempla las siguientes funcionalidades organizadas por módulo y tipo de usuario:

### 6.1 Registro e Inicio de Sesión
- Registro de usuarios con distintos roles: Alumno/Egresado, Empresa y Administrador.
- Autenticación segura mediante correo electrónico y contraseña con cifrado bcrypt.
- Gestión de sesión mediante tokens JWT (JSON Web Tokens).
- Recuperación de contraseña mediante enlace enviado al correo registrado.
- Validación de cuentas de empresa por parte del administrador antes de habilitar su acceso.

### 6.2 Perfil de Usuario (Alumno/Egresado)
- Creación y edición de perfil personal con datos académicos y profesionales.
- Inclusión de información sobre carrera cursada, año de egreso, habilidades técnicas e interpersonales, idiomas e intereses laborales.
- Foto de perfil y presentación personal (resumen profesional).
- Indicador de completitud del perfil para guiar al usuario.

### 6.3 Carga y Gestión de Currículum Vitae
- Subida de CV en formato PDF o generación de CV estructurado dentro de la plataforma.
- Posibilidad de actualizar el CV en cualquier momento.
- El CV cargado se adjunta automáticamente al postularse a una oferta.

### 6.4 Publicación de Ofertas Laborales (Empresa)
- Panel exclusivo para empresas habilitadas.
- Formulario de publicación con campos: título del puesto, descripción, requisitos, modalidad (presencial/remota/híbrida), remuneración estimada y fecha límite.
- Posibilidad de pausar, editar o cerrar una oferta publicada.

### 6.5 Búsqueda con Filtros
- Motor de búsqueda con filtros por: área profesional, modalidad, ubicación geográfica, nivel de experiencia y estado de la oferta.
- Ordenamiento por fecha de publicación o relevancia según el perfil del usuario.

### 6.6 Postulación a Ofertas
- Proceso de postulación simplificado una vez configurado el perfil y el CV.
- Posibilidad de incluir una carta de presentación personalizada.
- Control de postulaciones duplicadas.

### 6.7 Gestión de Postulaciones (Empresa)
- Lista de candidatos postulados con acceso a perfil y CV.
- Herramientas para comparar candidatos dentro de una misma oferta.
- Avance de candidatos entre distintas etapas del proceso de selección.

### 6.8 Estados de Postulaciones
- Seguimiento en tiempo real: *En revisión*, *Preseleccionado*, *Entrevista programada*, *No seleccionado*, *Contratado*.
- Historial completo de cambios de estado por postulación.

### 6.9 Panel Administrador (Institución)
- Gestión de usuarios: habilitación, suspensión y eliminación de cuentas.
- Aprobación y rechazo de nuevas empresas.
- Acceso a estadísticas globales del sistema.
- Generación de reportes exportables en PDF o CSV.

### 6.10 Moderación de Empresas y Publicaciones
- Revisión de empresas registradas para garantizar su legitimidad.
- Moderación de ofertas publicadas según lineamientos institucionales.
- Baja de publicaciones que no cumplan los criterios establecidos.

### 6.11 Notificaciones
- Notificaciones internas y por correo electrónico.
- Para alumnos/egresados: cuando una empresa visualiza su perfil, cambia el estado de su postulación o se publica una oferta acorde a su perfil.
- Para empresas: cuando un candidato se postula a alguna de sus ofertas.

### 6.12 Recomendaciones Automáticas (Módulo Innovador)
- Algoritmo de recomendación basado en carrera, habilidades, área de interés y experiencia.
- Sugerencia automática de ofertas en el inicio de sesión.
- Mejora continua conforme el usuario actualiza su perfil.

### 6.13 Historial de Postulaciones
- Registro histórico de todas las postulaciones del alumno/egresado.
- Filtros por fecha, empresa o estado final.

### 6.14 Estadísticas de Empleabilidad (Panel Institucional)
- Dashboard con: porcentaje de egresados empleados, tiempo promedio de inserción laboral, áreas con mayor demanda, empresas más activas.
- Gráficos interactivos actualizados en tiempo real.
- Exportación de datos para informes institucionales.

---

## 7. Características Técnicas

### 7.1 Arquitectura del Sistema

El sistema adopta una **arquitectura cliente-servidor de tres capas** con separación clara entre la capa de presentación (frontend), la capa de lógica de negocio (backend/API REST) y la capa de persistencia de datos (base de datos relacional).

```
┌─────────────────────┐
│   CLIENTE (React)   │  ← Capa de Presentación
│  Navegador Web      │
└────────┬────────────┘
         │ HTTP / REST API (JSON)
┌────────▼────────────┐
│  SERVIDOR (Node.js) │  ← Capa de Lógica de Negocio
│  Express.js + JWT   │
└────────┬────────────┘
         │ ORM (Sequelize)
┌────────▼────────────┐
│  BASE DE DATOS      │  ← Capa de Persistencia
│  PostgreSQL         │
└─────────────────────┘
```

### 7.2 Stack Tecnológico

#### Backend: Node.js + Express + Sequelize + PostgreSQL

- **Node.js:** entorno de ejecución de JavaScript del lado del servidor, reconocido por su alto rendimiento y modelo de I/O no bloqueante, ideal para manejar múltiples solicitudes concurrentes.
- **Express.js:** framework minimalista y flexible que facilita la construcción de APIs RESTful de manera rápida y modular, con soporte para middlewares de autenticación, validación y control de acceso.
- **Sequelize:** ORM para Node.js que permite interactuar con la base de datos mediante modelos JavaScript sin necesidad de escribir SQL manualmente, reduciendo errores y acelerando el desarrollo.
- **PostgreSQL:** sistema de gestión de bases de datos relacional de código abierto, reconocido por su estabilidad, consistencia e integridad referencial, ideal para gestionar las entidades del sistema.

#### Frontend: React (Vite)

- **React:** biblioteca de JavaScript para la construcción de interfaces de usuario interactivas y dinámicas, basada en componentes reutilizables y un sistema de estado reactivo.
- **Vite:** herramienta de build moderna que ofrece tiempos de arranque instantáneos y hot module replacement, optimizando el flujo de desarrollo.

#### Herramientas y Librerías Complementarias

| Herramienta         | Rol                                          |
|---------------------|----------------------------------------------|
| JWT                 | Autenticación y autorización por tokens      |
| bcrypt              | Cifrado seguro de contraseñas                |
| Multer              | Gestión de subida de archivos (CV en PDF)    |
| Nodemailer          | Envío de notificaciones por correo           |
| React Router DOM    | Enrutamiento del lado del cliente            |
| Axios               | Cliente HTTP para consumo de la API          |
| Chart.js / Recharts | Visualización de estadísticas                |
| dotenv              | Gestión de variables de entorno              |

### 7.3 Justificación de la Elección Tecnológica

La selección responde a criterios técnicos y pedagógicos. **JavaScript como lenguaje unificado** en frontend (React) y backend (Node.js) reduce la curva de aprendizaje y permite al equipo mantener coherencia en el desarrollo. La combinación **Express + Sequelize + PostgreSQL** ofrece una estructura sólida para modelar las relaciones complejas del dominio. El stack elegido cuenta con amplia comunidad activa, documentación oficial extensa y es altamente demandado en el mercado laboral, añadiendo valor formativo al proyecto.

### 7.4 Modelo de Datos (Entidades Principales)

| Entidad             | Descripción                                            |
|---------------------|--------------------------------------------------------|
| Usuario             | Datos de autenticación, rol, estado de cuenta          |
| Perfil              | Datos académicos y profesionales del alumno/egresado   |
| Empresa             | Datos de la empresa, estado de habilitación            |
| Oferta              | Publicación laboral con todos sus atributos            |
| Postulacion         | Relación entre usuario y oferta, con estado y fecha    |
| EstadoPostulacion   | Historial de cambios de estado de una postulación      |
| Notificacion        | Alertas internas para los usuarios                     |
| Recomendacion       | Sugerencias generadas por el motor de recomendaciones  |

---

## 8. Casos de Uso Principales

### Caso de Uso 1: Postulación a una Oferta
- **Actor principal:** Alumno / Egresado
- **Precondición:** El usuario tiene cuenta activa, perfil completo y CV cargado.
- **Flujo principal:**
  1. El usuario accede al listado de ofertas disponibles.
  2. Aplica filtros según su interés (área, modalidad, ubicación).
  3. Selecciona una oferta y visualiza su detalle completo.
  4. Hace clic en "Postularme".
  5. Opcionalmente redacta una carta de presentación.
  6. El sistema registra la postulación con estado "En revisión".
  7. Se envía una notificación a la empresa correspondiente.
- **Postcondición:** La postulación queda registrada y disponible en el historial del usuario y en el panel de la empresa.

### Caso de Uso 2: Publicación de una Oferta Laboral
- **Actor principal:** Empresa
- **Precondición:** La empresa tiene cuenta habilitada por el administrador.
- **Flujo principal:**
  1. La empresa accede a su panel y selecciona "Nueva Oferta".
  2. Completa el formulario con los datos de la posición.
  3. Publica la oferta.
  4. El sistema notifica a los alumnos/egresados con perfil afín.
  5. La oferta aparece en el listado visible para los postulantes.
- **Postcondición:** La oferta queda activa y disponible para postulaciones.

### Caso de Uso 3: Gestión de Candidatos (Empresa)
- **Actor principal:** Empresa
- **Precondición:** Existe al menos una postulación a alguna de las ofertas de la empresa.
- **Flujo principal:**
  1. La empresa accede al panel de gestión de postulaciones.
  2. Visualiza la lista de candidatos con su perfil y CV.
  3. Cambia el estado de un candidato (ej.: "Preseleccionado").
  4. El sistema notifica al candidato sobre el cambio de estado.
- **Postcondición:** El estado de la postulación queda actualizado y el candidato recibe la notificación correspondiente.

### Caso de Uso 4: Administración de la Plataforma
- **Actor principal:** Administrador (Institución)
- **Flujo principal:**
  1. El administrador accede al panel de control institucional.
  2. Revisa las solicitudes de nuevas empresas y decide aprobarlas o rechazarlas.
  3. Modera las ofertas activas para asegurar su pertinencia.
  4. Consulta el dashboard de estadísticas de empleabilidad.
  5. Exporta reportes para presentación institucional.

---

## 9. Requerimientos No Funcionales

| Categoría        | Requerimiento                                                                 |
|------------------|-------------------------------------------------------------------------------|
| **Seguridad**    | Autenticación JWT, cifrado de contraseñas con bcrypt, control de acceso por roles |
| **Usabilidad**   | Interfaz intuitiva, responsiva y compatible con navegadores modernos          |
| **Rendimiento**  | Tiempo de respuesta de la API inferior a 500ms en condiciones normales        |
| **Escalabilidad**| Arquitectura desacoplada que permita escalar frontend y backend de forma independiente |
| **Disponibilidad**| El sistema debe estar disponible al menos el 99% del tiempo                  |
| **Mantenibilidad**| Código documentado, modular y siguiendo estándares de nomenclatura claros   |
| **Privacidad**   | Los datos personales de los usuarios se almacenan de forma cifrada y no son accesibles públicamente sin autorización |

---

## 10. Cronograma de Trabajo

El proyecto se desarrollará a lo largo de aproximadamente **16 semanas** (4 meses), distribuidas en las siguientes etapas:

| Semana(s) | Etapa                                      | Actividades Principales                                                     |
|-----------|--------------------------------------------|-----------------------------------------------------------------------------|
| 1 – 2     | Planificación y Diseño                     | Relevamiento de requerimientos, diseño de base de datos, wireframes de UI   |
| 3 – 4     | Configuración del Entorno                  | Setup del proyecto, estructura de carpetas, variables de entorno, CI básico |
| 5 – 6     | Módulo de Autenticación y Usuarios         | Registro, login, JWT, roles, recuperación de contraseña                     |
| 7 – 8     | Módulo de Perfiles y CV                    | Perfil del alumno/egresado, carga de CV, perfil de empresa                 |
| 9 – 10    | Módulo de Ofertas y Búsqueda               | CRUD de ofertas, motor de búsqueda con filtros                              |
| 11 – 12   | Módulo de Postulaciones                    | Postulación, cambio de estados, historial, notificaciones                   |
| 13        | Módulo Administrador                       | Panel de administración, moderación, reportes                               |
| 14        | Módulo de Recomendaciones y Estadísticas   | Motor de recomendaciones, dashboard de empleabilidad                        |
| 15        | Pruebas y Corrección de Errores            | Testing funcional, pruebas de integración, corrección de bugs               |
| 16        | Documentación Final y Presentación         | Documentación técnica, manual de usuario, preparación de la presentación    |

---

## 11. Riesgos y Plan de Mitigación

| Riesgo                                          | Probabilidad | Impacto | Mitigación                                                              |
|-------------------------------------------------|:------------:|:-------:|-------------------------------------------------------------------------|
| Retrasos en el cronograma por imprevistos       | Media        | Alto    | Buffer de tiempo en cada etapa y reuniones semanales de seguimiento     |
| Dificultades técnicas con alguna tecnología     | Baja         | Medio   | Capacitación previa y lookup de documentación oficial                   |
| Cambios en los requerimientos durante el desarrollo | Baja    | Alto    | Definición clara del alcance al inicio y control de cambios formal      |
| Problemas de disponibilidad del equipo          | Media        | Medio   | Distribución equitativa de tareas y comunicación constante              |
| Vulnerabilidades de seguridad                   | Baja         | Alto    | Revisión de código, uso de librerías actualizadas y validación de inputs|

---

## 12. Recursos Necesarios

### 12.1 Recursos Humanos

| Integrante      | Rol Principal                          |
|-----------------|----------------------------------------|
| Vera Emanuel    | Backend Developer / Arquitectura       |
| Leiva Marlene   | Frontend Developer / UI-UX             |
| Mercado Lucas   | Backend Developer / Base de Datos      |
| Pedrazo Melisa  | Frontend Developer / Testing           |

### 12.2 Recursos Tecnológicos

- Computadoras personales de los integrantes del equipo.
- Acceso a Internet.
- Repositorio de código en GitHub (plan gratuito).
- Servidor de base de datos PostgreSQL (local en desarrollo, servicio en la nube en producción).
- Herramientas de diseño: Figma (plan gratuito).
- Entorno de desarrollo: Visual Studio Code.

### 12.3 Recursos de Software (todos gratuitos / open source)

- Node.js, Express, Sequelize, PostgreSQL.
- React, Vite, React Router DOM, Axios.
- Git para control de versiones.

---

## 13. Información Adicional

### 13.1 Público Objetivo

El sistema está dirigido a cuatro tipos de usuarios principales:

1. **Alumnos:** estudiantes de la institución próximos a finalizar su formación que desean acceder a su primera experiencia laboral formal.
2. **Egresados:** graduados que buscan oportunidades de inserción laboral vinculadas a su perfil profesional.
3. **Empresas:** organizaciones del sector público o privado que buscan incorporar jóvenes perfiles técnicos mediante pasantías o empleos de nivel inicial.
4. **Institución educativa:** actúa como administradora, garantizando la calidad de las empresas habilitadas, la pertinencia de las ofertas y el seguimiento del proceso de inserción laboral.

### 13.2 Valor del Sistema

El **Sistema de Gestión de Pasantías** aporta valor tangible a cada actor involucrado:

- **Para los alumnos y egresados:** acceso centralizado y organizado a oportunidades laborales, con un proceso de postulación simple, transparente y rastreable.
- **Para las empresas:** acceso a candidatos prevalidados por la institución, con perfiles estructurados y verificados, reduciendo tiempos y costos del proceso de selección.
- **Para la institución:** visibilidad y control sobre la inserción laboral de sus egresados, con datos para evaluar el impacto educativo y fortalecer vínculos con el sector productivo.
- **Para el ecosistema en general:** la plataforma contribuye a reducir la brecha entre la formación técnica y el mercado laboral, promoviendo una mayor empleabilidad y mejor calidad en la primera experiencia profesional de los jóvenes.

El diferencial innovador —las **recomendaciones automáticas** y el **panel de estadísticas de empleabilidad**— posiciona al proyecto por encima de una simple bolsa de trabajo, convirtiéndolo en una herramienta de inteligencia laboral con valor estratégico para la institución y sus egresados.

---

## 14. Conclusión

El **Sistema de Gestión de Pasantías** propuesto representa una solución integral, técnicamente sólida y socialmente relevante para una problemática concreta y frecuente en el ámbito de las instituciones educativas técnicas. La digitalización y centralización del proceso de vinculación laboral no solo optimiza los tiempos y recursos de todos los actores involucrados, sino que también eleva el nivel de profesionalismo y transparencia del proceso de inserción laboral.

El stack tecnológico elegido —Node.js, Express, Sequelize, PostgreSQL en el backend y React en el frontend— garantiza un desarrollo ágil, un producto de alta calidad y una base sólida para la escalabilidad futura del sistema. Los módulos innovadores de recomendaciones automáticas y estadísticas de empleabilidad añaden un diferencial significativo que trasciende los límites de un proyecto académico y acerca el sistema a un producto real con potencial de implementación institucional.

El equipo cuenta con los conocimientos técnicos necesarios, un plan de trabajo claro y los recursos requeridos para llevar adelante el desarrollo en los tiempos establecidos, con el objetivo de entregar un producto funcional, documentado y de alto impacto.

---

*Documento elaborado en el marco de la materia Prácticas Profesionalizantes III — Ciclo Lectivo 2026.*
