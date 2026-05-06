-- ============================================================
-- SCRIPT DE LIMPIEZA DE BASE DE DATOS — SisPasantías
-- Elimina todos los datos excepto los 3 usuarios especificados
-- y todo lo directamente vinculado a ellos.
--
-- EJECUTAR EN: pasantias_db
-- ORDEN: respeta claves foráneas (tablas hijas primero)
-- ============================================================

-- Usuarios a conservar
-- admin@pasantias.com
-- lucas.h.mercado@gmail.com
-- shell@gmail.com

BEGIN;

-- 1. Obtener los IDs a conservar (para referencia visual)
-- SELECT id, email, rol FROM usuarios WHERE email IN (
--   'admin@pasantias.com',
--   'lucas.h.mercado@gmail.com',
--   'shell@gmail.com'
-- );

-- ── Tablas sin dependencias de usuarios (borrar todo) ────────────────────────

-- Logs de actividad (SET NULL en usuarioId, borrar todo igualmente)
DELETE FROM activity_logs;

-- Notificaciones de usuarios que NO se conservan
DELETE FROM notificaciones
WHERE "usuarioId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
);

-- Mensajes donde emisor O receptor no se conservan
DELETE FROM mensajes
WHERE "emisorId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
)
OR "receptorId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
);

-- ── Tablas de postulaciones y avales ────────────────────────────────────────

-- Avales (dependen de postulaciones)
DELETE FROM avales
WHERE "postulacionId" IN (
  SELECT id FROM postulaciones
  WHERE "usuarioId" NOT IN (
    SELECT id FROM usuarios
    WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
  )
);

-- Postulaciones de usuarios que NO se conservan
DELETE FROM postulaciones
WHERE "usuarioId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
);

-- ── Tablas de empresas ───────────────────────────────────────────────────────

-- Solicitudes de reclutador (dependen de empresas)
DELETE FROM solicitudes_reclutador
WHERE "empresaId" IN (
  SELECT id FROM empresas
  WHERE "usuarioId" NOT IN (
    SELECT id FROM usuarios
    WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
  )
);

-- Equipo de reclutadores (dependen de empresas y usuarios)
DELETE FROM empresa_usuarios
WHERE "empresaId" IN (
  SELECT id FROM empresas
  WHERE "usuarioId" NOT IN (
    SELECT id FROM usuarios
    WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
  )
)
OR "usuarioId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
);

-- Postulaciones que apuntan a ofertas de empresas que se van a borrar
DELETE FROM postulaciones
WHERE "ofertaId" IN (
  SELECT o.id FROM ofertas o
  JOIN empresas e ON o."empresaId" = e.id
  WHERE e."usuarioId" NOT IN (
    SELECT id FROM usuarios
    WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
  )
);

-- Ofertas de empresas que NO se conservan
DELETE FROM ofertas
WHERE "empresaId" IN (
  SELECT id FROM empresas
  WHERE "usuarioId" NOT IN (
    SELECT id FROM usuarios
    WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
  )
);

-- Solicitudes de empresa pendientes (tabla independiente de usuarios)
DELETE FROM solicitudes_empresa;

-- Empresas de usuarios que NO se conservan
DELETE FROM empresas
WHERE "usuarioId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
);

-- ── Perfiles ─────────────────────────────────────────────────────────────────

DELETE FROM perfiles
WHERE "usuarioId" NOT IN (
  SELECT id FROM usuarios
  WHERE email IN ('admin@pasantias.com', 'lucas.h.mercado@gmail.com', 'shell@gmail.com')
);

-- ── Usuarios: borrar todos excepto los 3 indicados ───────────────────────────

DELETE FROM usuarios
WHERE email NOT IN (
  'admin@pasantias.com',
  'lucas.h.mercado@gmail.com',
  'shell@gmail.com'
);

-- ── Verificación final ───────────────────────────────────────────────────────
SELECT 'Usuarios restantes:' AS info, count(*) FROM usuarios
UNION ALL
SELECT 'Perfiles restantes:', count(*) FROM perfiles
UNION ALL
SELECT 'Empresas restantes:', count(*) FROM empresas
UNION ALL
SELECT 'Ofertas restantes:', count(*) FROM ofertas
UNION ALL
SELECT 'Postulaciones restantes:', count(*) FROM postulaciones
UNION ALL
SELECT 'Mensajes restantes:', count(*) FROM mensajes
UNION ALL
SELECT 'Notificaciones restantes:', count(*) FROM notificaciones
UNION ALL
SELECT 'Solicitudes empresa restantes:', count(*) FROM solicitudes_empresa
UNION ALL
SELECT 'Activity logs restantes:', count(*) FROM activity_logs;

COMMIT;
