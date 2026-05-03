# Multi-Usuario por Empresa — Documentación Técnica

**Sistema de Gestión de Pasantías — v1.5**

---

## Resumen

Permite que una empresa tenga múltiples usuarios (reclutadores, gerentes, viewers) gestionados por la cuenta propietaria. El propietario puede invitar usuarios existentes o crear nuevos automáticamente con contraseña temporal.

---

## Arquitectura

```
empresa (1) ←──── empresa_usuarios (N) ────→ usuario (N)
                       │
                  rolInterno ENUM
              (propietario / gerente / reclutador / viewer)
```

La tabla `empresa_usuarios` es la fuente de verdad para los permisos. El campo `activo` permite suspender el acceso sin perder el historial.

---

## Roles internos

| Rol | Descripción | Se puede asignar al invitar |
|---|---|:---:|
| `propietario` | Dueño de la empresa. Creado automáticamente al registrar. Acceso total. | ❌ |
| `gerente` | Gestiona el equipo y el perfil de la empresa. Puede crear ofertas. | ✅ |
| `reclutador` | Crea ofertas y gestiona el proceso de selección. | ✅ |
| `viewer` | Solo lectura. Ve dashboard, ofertas y candidatos. No puede modificar nada. | ✅ |

### Matriz de permisos

| Acción | propietario | gerente | reclutador | viewer |
|---|:---:|:---:|:---:|:---:|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |
| Ver mis ofertas | ✅ | ✅ | ✅ | ✅ |
| Ver equipo | ✅ | ✅ | ✅ | ✅ |
| Ver candidatos de una oferta | ✅ | ✅ | ✅ | ✅ |
| Editar perfil empresa | ✅ | ✅ | ❌ | ❌ |
| Crear / editar / cerrar oferta | ✅ | ✅ | ✅ | ❌ |
| Cambiar estado postulación | ✅ | ✅ | ✅ | ❌ |
| Invitar miembro al equipo | ✅ | ❌ | ❌ | ❌ |
| Editar rol de un miembro | ✅ | ❌ | ❌ | ❌ |
| Suspender / reactivar miembro | ✅ | ❌ | ❌ | ❌ |

---

## Endpoints

### Equipo — `GET /api/empresas/equipo`

Devuelve todos los miembros del equipo (activos e inactivos).

**Acceso:** cualquier miembro del equipo  
**Respuesta:**
```json
{
  "success": true,
  "total": 3,
  "data": [
    {
      "id": 1,
      "rolInterno": "propietario",
      "activo": true,
      "usuario": {
        "id": 5,
        "nombre": "Ana",
        "apellido": "García",
        "email": "ana@empresa.com",
        "ultimoAcceso": "2026-04-28T19:00:00Z"
      }
    }
  ]
}
```

---

### Invitar miembro — `POST /api/empresas/equipo`

Agrega un usuario al equipo. Si el email no existe en el sistema, **crea el usuario automáticamente** y genera un **link de activación** para que el reclutador establezca su propia contraseña.

**Acceso:** solo `propietario`

**Body:**
```json
{
  "email": "reclutador@empresa.com",
  "rolInterno": "reclutador",
  "nombre": "Carlos",
  "apellido": "López"
}
```

**Campos opcionales:** `nombre`, `apellido` (solo usados si el usuario no existe)  
**Roles válidos para invitar:** `gerente`, `reclutador`, `viewer`

#### Flujo para usuario nuevo (no registrado)

```
Propietario invita → Backend crea usuario con contraseña bloqueada
                   → Genera tokenReset válido por 72hs
                   → Si EMAIL configurado → envía email al reclutador automáticamente
                   → Si NO hay EMAIL → devuelve linkActivacion en la respuesta
                   → Reclutador hace clic en el link → /reset-password/:token
                   → Pone su propia contraseña → puede ingresar normalmente
```

**Respuesta (usuario nuevo, sin email configurado — modo dev):**
```json
{
  "success": true,
  "message": "Usuario creado e incorporado al equipo. Compartí el link de activación con el reclutador.",
  "data": { "miembro": {...}, "usuario": {...} },
  "usuarioCreado": true,
  "linkActivacion": "http://localhost:5173/reset-password/abc123...",
  "instruccion": "Compartí este link con el reclutador para que establezca su contraseña. Vence en 72 horas."
}
```

**Respuesta (usuario nuevo, con email configurado — modo producción):**
```json
{
  "success": true,
  "message": "Usuario creado e incorporado al equipo. Compartí el link de activación con el reclutador.",
  "data": { "miembro": {...}, "usuario": {...} },
  "usuarioCreado": true
}
```
*(El link se envió directamente al email del reclutador)*

#### Flujo para usuario existente

```json
{
  "success": true,
  "message": "Miembro agregado al equipo. Ya puede ingresar con su cuenta existente.",
  "data": { "miembro": {...}, "usuario": {...} },
  "usuarioCreado": false
}
```

> **⚠️ Nota:** El reclutador nuevo nunca recibe ni necesita una contraseña temporal. Simplemente hace clic en el link de activación y establece su propia contraseña usando el endpoint `POST /api/auth/reset-password/:token`.

---

### Actualizar miembro — `PATCH /api/empresas/equipo/:id`

Cambia el rol o el estado activo de un miembro.

**Acceso:** solo `propietario`

**Body (al menos un campo):**
```json
{
  "rolInterno": "gerente",
  "activo": false
}
```

**Restricciones:**
- No se puede cambiar el rol del `propietario`
- No se puede asignar el rol `propietario` a otro usuario

---

### Dar de baja — `DELETE /api/empresas/equipo/:id`

Suspende el acceso de un miembro (soft delete — conserva el historial).

**Acceso:** solo `propietario`

---

## Middlewares

### `verifyEmpresaMember`

Archivo: `backend/src/middleware/empresa.middleware.js`

Resuelve la empresa del usuario autenticado y adjunta en el request:
- `req.empresa` → instancia de `Empresa`
- `req.miembroEmpresa` → registro de `EmpresaUsuario` con `rolInterno`

**Flujo de resolución:**
1. Si el usuario es propietario directo (`empresa.usuarioId === req.usuario.id`) → crea membresía virtual con `propietario`
2. Si tiene membresía activa en `empresa_usuarios` → usa ese registro
3. Si no tiene acceso → `404 SIN_EMPRESA`

### `authorizeEmpresaRoles(...roles)`

Factory que verifica el `rolInterno` de `req.miembroEmpresa`. El propietario siempre pasa.

**Ejemplo:**
```js
authorizeEmpresaRoles('propietario', 'gerente') // pasan propietario y gerente
```

### `tieneRolMinimo(rolActual, rolMinimo)`

Helper programático para checks en controllers sin middleware adicional.

```js
const { tieneRolMinimo } = require('../middleware/empresa.middleware');
if (!tieneRolMinimo(req.miembroEmpresa.rolInterno, 'gerente')) {
  return res.status(403).json({ ... });
}
```

---

## Migraciones SQL

Las migraciones deben ejecutarse en orden numérico:

| # | Archivo | Descripción |
|---|---|---|
| 003 | `003_tabla_empresa_usuarios.sql` | Crea la tabla y el ENUM con roles iniciales |
| 009 | `009_add_viewer_role_empresa_usuarios.sql` | Agrega el rol `viewer` al ENUM |

**Ejecutar en PostgreSQL:**
```sql
\i migrations/003_tabla_empresa_usuarios.sql
\i migrations/009_add_viewer_role_empresa_usuarios.sql
```

---

## Flujo de registro de empresa

Al registrar un usuario con `rol: 'empresa'`, `auth.controller.js` crea automáticamente:

1. `Usuario` con `habilitado: false` (requiere aprobación del admin)
2. `Empresa` con `estadoAprobacion: 'pendiente'`
3. `EmpresaUsuario` con `rolInterno: 'propietario'` y `activo: true`

Esto garantiza que el propietario aparezca en el equipo desde el primer día y que el sistema multi-usuario funcione desde el registro.

---

## Retrocompatibilidad

Todos los cambios son retrocompatibles:

- Los controllers de oferta y postulación usan `_resolverEmpresa(req)` que prioriza `req.empresa` (del middleware) pero hace fallback a `Empresa.findOne({ usuarioId: req.usuario.id })` si no está disponible.
- Los propietarios directos sin registro en `empresa_usuarios` (cuentas anteriores a v1.5) obtienen un objeto virtual de membresía con `rolInterno: 'propietario'`, garantizando acceso total.
- El JWT y los roles del sistema (`alumno`, `egresado`, `empresa`, `profesor`, `admin`) no fueron modificados.

---

## Checklist de despliegue

- [ ] Ejecutar migración `009_add_viewer_role_empresa_usuarios.sql` en la base de datos
- [ ] Verificar que las empresas existentes tengan registros en `empresa_usuarios` (o confiar en el fallback virtual)
- [ ] Opcional: crear registros retroactivos con:
  ```sql
  INSERT INTO empresa_usuarios ("empresaId", "usuarioId", "rolInterno", activo, "createdAt", "updatedAt")
  SELECT id, "usuarioId", 'propietario', true, NOW(), NOW()
  FROM empresas
  WHERE NOT EXISTS (
    SELECT 1 FROM empresa_usuarios eu
    WHERE eu."empresaId" = empresas.id AND eu."rolInterno" = 'propietario'
  );
  ```
- [ ] Configurar envío de email para la contraseña temporal (actualmente en respuesta JSON)
