# 📋 Resumen de Cambios — Commit del día (2026-04-24)

---

## 🗄️ Cambios en la Base de Datos (PostgreSQL + Sequelize)

> El proyecto usa `sequelize.sync({ alter: true })` — los cambios de esquema se aplican **automáticamente al reiniciar el backend**. No hay migraciones manuales.

### Tabla `avales` — columna nueva

```sql
ALTER TABLE avales ADD COLUMN "mensajeAlumno" TEXT;
```

- **Qué es**: mensaje opcional que el alumno escribe al solicitar un aval al profesor.
- **Nullable**: sí (`allowNull: true`).
- **Dónde se define**: `backend/src/models/aval.model.js`.
- **Efecto**: al reiniciar el backend con `alter: true`, Sequelize ejecuta el ALTER TABLE automáticamente.

### Sin otros cambios de esquema hoy

El resto de los cambios fueron solo en **lógica de negocio** (controladores, rutas) y **frontend** — no se crearon ni eliminaron tablas ni columnas adicionales.

| Tabla | Cambio |
|---|---|
| `avales` | ✅ Nueva columna `mensajeAlumno TEXT NULL` |
| `notificaciones` | Sin cambios (los campos `prioridad`, `tipoVisual`, `accionURL` ya existían de sesiones anteriores) |
| `postulaciones` | Sin cambios |
| `empresas` | Sin cambios |
| `ofertas` | Sin cambios |
| `usuarios` | Sin cambios |

---

## 🎓 Sistema de Avales Académicos (Feature completa)

### Backend

#### `backend/src/models/aval.model.js`
- Agregado campo `mensajeAlumno` (TEXT, nullable) para que el alumno pueda enviar contexto al solicitar un aval.

#### `backend/src/controllers/profesor.controller.js`
- `listarProfesores()` — nuevo endpoint público que lista usuarios con rol `profesor` para que los alumnos puedan buscarlos.
- `solicitarAval()` — nuevo endpoint que permite al alumno solicitar un aval a un profesor para una postulación específica, con mensaje opcional.
- `getMisAvales()` — actualizado para incluir datos de la empresa y la oferta en la respuesta.
- `updateAval()` — actualizado para soportar cualquier `estado` (pendiente/aprobado/rechazado) desde un único endpoint `PATCH /avales/:id`.

#### `backend/src/routes/profesor.routes.js`
- `GET  /api/profesor/lista` — lista de profesores (accesible para alumnos autenticados).
- `POST /api/profesor/solicitar-aval` — solicitud de aval desde el alumno.

#### `backend/src/controllers/postulacion.controller.js`
- `getMisPostulaciones()` — actualizado para incluir los avales con datos del profesor (alumno ve su aval).
- `getPostulacionesByOferta()` — actualizado para incluir avales (empresa ve el aval de cada candidato).
- Agregado guard `if (!empresa)` con 403 descriptivo (evitaba crash con `null.id`).
- Include de `Aval` movido al import de nivel superior (eliminados `require()` internos).
- Include de avales con `try/catch` separado para que un error en avales no rompa toda la query.
- Devuelve `detail: error.message` en errores 500 para facilitar el debug.

---

## 🏢 Panel de Empresa — Dashboard y Postulaciones

### Backend

#### `backend/src/controllers/empresa.controller.js`
- `getMisOfertas()` — nuevo endpoint que devuelve **solo las ofertas de la empresa autenticada** con el conteo de postulaciones por oferta.

#### `backend/src/routes/empresa.routes.js`
- `GET /api/empresas/mis-ofertas` — ruta nueva hacia `getMisOfertas`.

### Frontend

#### `frontend/src/pages/empresa/EmpresaDashboardPage.jsx` — Reescritura completa
- **Antes**: usaba `ofertaService.getAll({})` que traía TODAS las ofertas del sistema.
- **Ahora**: usa `empresaService.getMisOfertas()` → solo las ofertas propias.
- Tabla mejorada con columna **Postulados** (conteo real por oferta).
- Indicador "⏳ Pendiente" para ofertas sin moderar.
- Estado `guardando` por oferta (deshabilita la fila mientras se procesa).
- Actualización optimista de métricas al pausar/cerrar una oferta.
- Manejo de errores visible en pantalla.

#### `frontend/src/pages/empresa/EmpresaDashboardPage.module.css`
- Nuevos estilos: `.totalBadge`, `.ofertasTablaWrap`, `.centrado`, `.modalidadSmall`, `.pendienteMod`, `.rowGuardando`, `.guardandoSpan`.

#### `frontend/src/pages/empresa/PostulantesMiOfertaPage.jsx`
- Agregado estado `error` con mensaje visible si el backend falla.
- Corregido bug de `\n` literal en declaración de `useState`.
- Componente `AvalBadge` que muestra el estado del aval académico de cada candidato (aprobado/pendiente/rechazado/sin aval).

#### `frontend/src/pages/empresa/PostulantesMiOfertaPage.module.css`
- Nuevos estilos para el `AvalBadge` con variables CSS dinámicas (`--aval-bg`, `--aval-color`, `--aval-border`).

---

## 👨‍🏫 Panel del Profesor — Gestión de Avales

#### `frontend/src/pages/profesor/ProfesorAvalesPage.jsx` — Reescritura completa
- Estado vacío con mensaje útil: _"Todavía no recibiste solicitudes. Los alumnos te buscarán desde su panel."_
- `AvalCard` mejorada con acceso correcto a `aval.postulacion.usuario` (bug del camino de datos corregido).
- Botón unificado: **"✍️ Responder"** (pendiente) / **"✏️ Editar"** (ya resuelto).
- **Modal de edición** con 3 radio buttons (Pendiente / Aprobado / Rechazado) + textarea contextual.
- Actualización optimista al guardar.
- Skeletons de carga, filtros por estado (tabs), banner de éxito.

#### `frontend/src/pages/profesor/ProfesorAvalesPage.module.css` — Reescritura completa
- Estilos para cards con `border-left` de color según estado.
- Estilos del modal con animación `slideUp`.
- Radio buttons estilizados para selección de estado.
- Responsive para mobile.

---

## 🔔 Sistema de Notificaciones

### Backend

#### `backend/src/routes/notificacion.routes.js` — Reescritura completa
- 🐛 **Bug crítico corregido**: `PATCH /leer-todas` estaba DESPUÉS de `PATCH /:id/leer` → Express lo interpretaba como un ID. Ahora `leer-todas` va primero.
- `GET  /sin-leer-count` — conteo liviano para polling del badge en el Navbar.
- `DELETE /:id` — nuevo endpoint para eliminar notificaciones propias.
- Ordenamiento mejorado: no leídas primero, luego por fecha descendente.

### Frontend

#### `frontend/src/services/api.js`
- `notificacionService.sinLeerCount()` — nuevo.
- `notificacionService.eliminar(id)` — nuevo.
- `empresaService.getMisOfertas()` — nuevo.
- `empresaService` limpiado y alineado.
- `profesorService.updateAval(id, estado, comentario)` — método unificado nuevo.

#### `frontend/src/pages/NotificacionesPage.jsx` — Archivo nuevo
- Lista completa con filtros: **Todas / Sin leer / Leídas**.
- Marcar como leída al hacer clic (con navegación a `accionURL`).
- Botón "Marcar todas como leídas".
- Botón eliminar por notificación.
- Timestamps relativos ("Hace 5 min", "Hace 2 días", etc.).
- Indicador visual 🔴 Urgente para prioridad alta/urgente.
- Skeletons de carga, estado vacío contextual.
- Actualizaciones optimistas (sin esperar al backend para actualizar la UI).

#### `frontend/src/pages/NotificacionesPage.module.css` — Archivo nuevo
- Card con punto indicador de no leída.
- Botones de acción que aparecen en hover.
- Filtro tabs con contadores.
- Responsive mobile.

#### `frontend/src/App.jsx`
- Import y ruta `/notificaciones` registrada (accesible para todos los roles autenticados).

---

## 🔐 Refactorización Multi-rol — Frontend

### AuthContext & Routing

#### `frontend/src/context/AuthContext.jsx`
- Función `normalizarUsuario()` — garantiza que todos los campos del usuario existan aunque el backend no los envíe.
- Objeto `usuario` extendido: `telefono`, `ubicacion`, `fotoPerfil`, `ultimoAcceso`, `razonSocial`.
- Función `actualizarUsuario()` — actualiza el estado sin logout/login (usado al editar perfil).
- Helpers de rol exportados: `esAdmin`, `esEmpresa`, `esProfesor`, `esAlumno`.

#### `frontend/src/App.jsx`
- `ProtectedRoute` con soporte de array `roles={['admin', 'profesor']}` y `redirectTo` configurable.
- Función `getRutaInicio(rol)` centraliza la lógica de redirección post-login.
- Redirecciones: `admin→/admin`, `empresa→/empresa`, `profesor→/profesor`, `alumno/egresado→/dashboard`.
- Nuevas rutas: `/dashboard`, `/profesor`, `/chat`, `/empresa/equipo`, `/notificaciones`.

### Navbar

#### `frontend/src/components/Navbar/Navbar.jsx`
- Links dinámicos por rol (alumno, egresado, empresa, profesor, admin).
- Soporte `fotoPerfil` en avatar (imagen circular).
- Click-outside para cerrar el dropdown.
- Detección de ruta activa por subruta (`startsWith`).
- Dropdown muestra `telefono` y `ubicacion` si están disponibles.

### Auth Pages

#### `frontend/src/pages/auth/RegisterPage.jsx`
- Rol `profesor` en el selector de tipo de cuenta.
- Campos nuevos: `telefono` y `ubicacion` (opcionales).
- Aviso de aprobación pendiente para empresa y profesor.
- Redirección post-registro: alumno/egresado → `/dashboard`.

#### `frontend/src/pages/auth/LoginPage.jsx`
- Redirección post-login para `profesor → /profesor`.

---

## 🎓 Panel del Alumno — Dashboard Profesional

#### `frontend/src/pages/alumno/AlumnoDashboardPage.jsx` — Archivo nuevo
- Métricas: `GET /api/students/dashboard` (total, en revisión, entrevistas, contrataciones).
- Barra de perfil completado con color dinámico (rojo/amarillo/verde).
- Ofertas recomendadas: `GET /api/ofertas/recomendadas` (lazy load).
- Accesos rápidos: Ofertas, Mis Postulaciones, Perfil, Chat.
- Skeleton loaders con animación shimmer.
- Manejo graceful de endpoints faltantes (muestra aviso sin romperse).

#### `frontend/src/pages/alumno/OfertasPage.jsx` — Activada y extendida
- **Antes**: `UnderConstructionPage`.
- **Ahora**: tabs **Todas | ⭐ Recomendadas**, filtros con limpiar, match score pill, skeleton grid.

#### `frontend/src/pages/alumno/MisPostulacionesPage.jsx`
- Tabs de filtro por estado (clickeables con conteo).
- Campos nuevos: `ultimaActualizacion`, `observacionesEmpresa`.
- Skeleton loading y empty state.

#### `frontend/src/pages/alumno/PerfilPage.jsx`
- **4 secciones organizadas**: Datos Académicos, Redes y Portfolio, Experiencia y Proyectos, Preferencias Laborales.
- **9 campos nuevos**: `portfolio`, `experienciaLaboral`, `proyectos`, `certificaciones`, `salarioPretendido`, `preferenciasLaborales`, `visibilidadPerfil`, `redesSociales`, `fotoPerfil`.
- Barra de completitud del perfil (%).
- Todos los campos existentes preservados.

---

## 👨‍🏫 Panel del Profesor — Nuevo

#### `frontend/src/pages/profesor/ProfesorDashboardPage.jsx` — Archivo nuevo
- Panel de bienvenida personalizado con accesos rápidos.
- Cards: Mis Alumnos, Avales Pendientes, Mensajes, Reportes.

---

## 🐛 Bugs corregidos puntuales

| Bug | Archivo | Fix |
|---|---|---|
| `empresa` podía ser `null` → crash en `.id` | `postulacion.controller.js` | Guard `if (!empresa)` con 403 |
| Import con `../../services/api` desde `src/pages/` | `NotificacionesPage.jsx` | Corregido a `../services/api` |
| `\n` literal en declaración `useState` | `PostulantesMiOfertaPage.jsx` | Línea separada |
| `PATCH /leer-todas` interpretado como `/:id` | `notificacion.routes.js` | Reordenamiento de rutas |
| `Aval` importado con `require()` interno | `postulacion.controller.js` | Movido al import top-level |
| Empresa veía ofertas de todo el sistema | `EmpresaDashboardPage.jsx` | Usa `getMisOfertas()` propio |
| Links activos del Navbar no detectaban subrutas | `Navbar.jsx` | Cambiado a `startsWith()` |

---

## 📝 Mensaje de commit

```
feat: sistema de avales académicos, dashboard empresa y notificaciones

Frontend — Multi-rol
- AuthContext: normalizarUsuario(), actualizarUsuario(), helpers esAdmin/esProfesor/etc.
- App: ProtectedRoute multi-rol, getRutaInicio(), 5 roles con redirección correcta
- Navbar: links por rol, fotoPerfil en avatar, click-outside, ruta activa por subruta
- RegisterPage: rol profesor, campos telefono/ubicacion, aviso aprobación pendiente
- LoginPage: redirección profesor→/profesor

Frontend — Panel Alumno
- AlumnoDashboardPage (nueva): métricas, barra perfil, recomendadas, accesos rápidos
- OfertasPage: activada con tabs Todas|Recomendadas, skeleton, filtros
- MisPostulacionesPage: filtros por estado, ultimaActualizacion, observacionesEmpresa
- PerfilPage: 9 campos nuevos en 4 secciones + barra de completitud

Frontend — Panel Empresa
- EmpresaDashboardPage: usa getMisOfertas() (solo ofertas propias), conteo postulados
- PostulantesMiOfertaPage: AvalBadge por candidato, error visible, fix \n literal
- ProfesorDashboardPage (nueva): panel con quick-access cards

Backend — Avales
- Aval: campo mensajeAlumno, alumno solicita aval con mensaje opcional
- Profesor: listarProfesores(), solicitarAval(), updateAval() unificado
- Postulacion: incluye avales en getMias() y getByOferta()

Backend — Empresa
- getMisOfertas() con conteo real de postulaciones por oferta
- GET /api/empresas/mis-ofertas

Backend — Notificaciones
- Fix crítico: PATCH /leer-todas reordenado antes de /:id
- GET /sin-leer-count, DELETE /:id
- NotificacionesPage completa: filtros, marcar leída, eliminar, timestamps relativos

Fixes: empresa null→403, import path incorrecto, require() interno en controller
```

---

---

# 📋 Segunda ronda de cambios — Commit del día (2026-04-24)

---

## 🏢 Refactorización Panel Empresa — Backend corporativo

### `frontend/src/services/api.js`
- `empresaService.getDashboard()` → `GET /api/empresas/dashboard` (métricas corporativas).
- `empresaService.getEquipo()` / `agregarMiembro()` / `editarMiembro()` / `eliminarMiembro()`.
- `adminService.getDashboardGeneral()` → `GET /api/admin/dashboard-general`.
- `adminService.getActividadReciente()` → `GET /api/admin/actividad-reciente`.
- `profesorService.getPostulaciones()` → `GET /api/profesor/postulaciones`.
- `profesorService.getAvales()` → `GET /api/profesor/avales`.
- `profesorService.aprobarAval(id, comentario)` — soporta comentario opcional.

### `frontend/src/pages/empresa/EmpresaDashboardPage.jsx` — Reescritura completa
- Consume `GET /api/empresas/dashboard` con skeleton shimmer.
- **6 tarjetas métricas**: ofertas activas/cerradas, postulaciones, entrevistas, contrataciones, miembros del equipo.
- Estado vacío con CTA, acceso rápido al panel de equipo.
- Acción de **cerrar** oferta además de pausar/activar.

### `frontend/src/pages/empresa/CrearOfertaPage.jsx`
- **5 campos nuevos**: `salario`, `beneficios`, `cantidadVacantes`, `modalidadExtendida`, `fechaPublicacion`.
- Opción `senior` en nivel de experiencia.
- Campos agrupados en filas lógicas (área/nivel, modalidad/jornada, ciudad/vacantes, remuneración/fechas).

### `frontend/src/pages/empresa/PostulantesMiOfertaPage.jsx` — Reescritura completa
- **Barra de compatibilidad** con color semáforo (verde ≥75%, naranja ≥50%, rojo <50%).
- **Descarga de CV** directo al archivo del servidor.
- **Historial académico**: carrera, institución, año de egreso en caja con `border-left` azul.
- **Disponibilidad** del candidato visible.
- Filtro por estado en la parte superior.
- Estados backend corporativo: `en_revision`, `preseleccionado`, `entrevista`, `contratado`, `rechazado`.

### `frontend/src/pages/empresa/EquipoPage.jsx` — Archivo nuevo
- Ruta `/empresa/equipo`.
- Tabla de reclutadores con avatar circular (inicial del nombre).
- **Edición inline** del rol: clic → celda se convierte en `<select>`.
- Formulario colapsable para agregar miembro (email + rol).
- Eliminar con `window.confirm()`. Skeleton de carga.

---

## 👨‍🏫 Panel del Profesor — Funcional

### `frontend/src/pages/profesor/ProfesorDashboardPage.jsx` — Reescritura completa
- Consume **3 endpoints en paralelo**: `getMisAlumnos()`, `getPostulaciones()`, `getAvalesPendientes()`.
- **3 tarjetas métricas** con color dinámico (`--mc`).
- **Grid de alumnos** con avatar verde circular, carrera y disponibilidad.
- **Tabla de postulaciones** con badge de estado por color.
- **Banner de alerta** amarillo si hay avales pendientes con CTA "Revisar ahora".

### `frontend/src/pages/profesor/ProfesorAvalesPage.jsx` — Reescritura completa
- Filtros **tipo tab** (Todos / Pendiente / Aprobado / Rechazado) con contador.
- `AvalCard`: info de alumno y oferta, comentario existente, fecha de solicitud.
- **Aprobar**: textarea de comentario opcional con toggle.
- **Rechazar**: `RechazarModal` con motivo **obligatorio** — no se puede enviar vacío.
- Actualización optimista en el frontend (sin esperar refetch).
- Skeleton de 3 tarjetas, estado vacío contextual.

---

## 🛡️ Panel de Administración — Migración

### `frontend/src/pages/admin/AdminDashboardPage.jsx` — Refactorizado
- Migrado a `GET /api/admin/dashboard-general` con **fallback automático** al endpoint legacy.
- **6 tarjetas métricas** con ícono y color propio via `--sc`.
- **Gráfico de barras multi-color** (recharts, una `Cell` por barra).
- **Feed de actividad reciente**: hasta 10 ítems con ícono, descripción y timestamp.
- `Promise.allSettled()` → un endpoint fallido no bloquea los demás.

---

## 💬 Chat / Mensajería Interna

### `frontend/src/pages/ChatPage.jsx` — Archivo nuevo
- Rutas: `/chat` y `/chat/:usuarioId`.
- **Layout de dos paneles** (sidebar de conversaciones + panel de mensajes).
- **Sidebar**: lista con preview, hora y badge de no leídos. Activo en azul primario.
- **Burbujas** diferenciadas: propias (azul, derecha) / ajenas (blanca, con avatar).
- **Separadores de fecha** automáticos entre mensajes de distintos días.
- **Polling cada 10 segundos** con cleanup en el efecto.
- **Marcado de leídos automático** al abrir conversación.
- Tick ✓/✓✓ según `leido` en burbujas propias.
- **Responsive mobile**: sidebar y main se alternan. Botón ← solo en mobile.

---

## 🧭 Navbar — Mejoras v2

### `frontend/src/components/Navbar/Navbar.jsx` — Actualizado
- **Badge de chat** 💬: botón circular con contador de mensajes no leídos.
- **Badge de notificaciones** 🔔 sensible a prioridad:
  - Alta / urgente → rojo con animación `pulse`.
  - Normal → azul semitransparente.
  - Clickeable → navega a `/notificaciones`.
- **Dropdown mejorado**: nombre completo, divisor, botón de notif con badge "¡Urgente!".
- Links actualizados: Empresa agrega "Equipo", Profesor agrega "Avales".

---

## 🗺️ Router (App.jsx) — Nuevas rutas

| Ruta | Componente | Roles |
|---|---|---|
| `/empresa/equipo` | `EquipoPage` | `empresa` |
| `/profesor/avales` | `ProfesorAvalesPage` | `profesor`, `admin` |
| `/chat` | `ChatPage` | todos los roles |
| `/chat/:usuarioId` | `ChatPage` | todos los roles |

- Eliminado import de `UnderConstructionPage` (ya no se usa en `/chat`).

---

## 🎨 Estilos globales (globals.css)

- `.badge-entrevista` → `#8e44ad` (morado).
- `.badge-rechazado` → `var(--danger)` (rojo).

---

## 🐛 Bugs corregidos (segunda ronda)

| Bug | Archivo | Fix |
|---|---|---|
| Imports `../../context/AuthContext` desde `src/pages/` | `ChatPage.jsx` | Corregido a `../context/AuthContext` y `../services/api` |

---

## 📝 Mensaje de commit (segunda ronda)

```
feat: evolucion completa del frontend institucional - 24/04/2026

PANEL EMPRESA (refactorizacion):
- EmpresaDashboardPage: consume GET /api/empresas/dashboard, 6 tarjetas de metricas,
  skeleton y estado vacio
- CrearOfertaPage: 5 campos nuevos (salario, beneficios, cantidadVacantes,
  modalidadExtendida, fechaPublicacion)
- PostulantesMiOfertaPage: barra de compatibilidad, descarga CV, historial academico,
  disponibilidad, filtros, estados corporativos
- EquipoPage: nueva /empresa/equipo, CRUD reclutadores, edicion inline, skeleton
- api.js: empresaService completo (getDashboard, getEquipo, CRUD miembros)

PANEL PROFESOR (funcional):
- ProfesorDashboardPage: 3 endpoints paralelos, tarjetas, grid alumnos, alerta avales
- ProfesorAvalesPage: tabs por estado, aprobar con comentario, rechazar con modal
- api.js: getPostulaciones, getAvales, aprobarAval(id, comentario)

PANEL ADMIN (migracion):
- AdminDashboardPage: dashboard-general con fallback legacy, actividad reciente,
  grafico multi-color, skeleton

CHAT / MENSAJERIA:
- ChatPage: dos paneles WhatsApp Web, burbujas, separadores fecha, polling 10s,
  marcado leidos, responsivo mobile

NAVBAR (mejoras v2):
- Badge chat con contador, badge notif con prioridad (rojo urgente / azul normal),
  dropdown con nombre completo y acceso rapido notificaciones

ROUTER:
- /empresa/equipo, /profesor/avales, /chat, /chat/:usuarioId

BUGFIX:
- Imports relativos en ChatPage.jsx (../../ -> ../)
```
