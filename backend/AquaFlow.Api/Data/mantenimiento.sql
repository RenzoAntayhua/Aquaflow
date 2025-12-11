-- =====================================================
-- AQUAFLOW - SCRIPT DE MANTENIMIENTO PERIÓDICO
-- Ejecutar semanalmente para mantener buen rendimiento
-- =====================================================

-- 1. Eliminar tokens de recuperación expirados
DELETE FROM recuperacion_tokens WHERE "ExpiraEn" < NOW();

-- 2. Actualizar estadísticas de todas las tablas
ANALYZE usuarios;
ANALYZE aulas;
ANALYZE inscripciones;
ANALYZE puntos;
ANALYZE eventos;
ANALYZE perfil_estudiante_aggs;
ANALYZE retos_aula;
ANALYZE insignias_usuario;
ANALYZE preguntas;
ANALYZE colegios;
ANALYZE espacios;
ANALYZE consumos_agregados;

-- 3. Vacuum para liberar espacio (no bloquea)
VACUUM (VERBOSE, ANALYZE) usuarios;
VACUUM (VERBOSE, ANALYZE) eventos;
VACUUM (VERBOSE, ANALYZE) puntos;
VACUUM (VERBOSE, ANALYZE) inscripciones;

-- 4. Refrescar perfiles de estudiantes con datos obsoletos (más de 1 hora)
-- Esto es opcional, la app lo hace bajo demanda
-- UPDATE perfil_estudiante_aggs 
-- SET "UltimaActualizacion" = '1970-01-01' 
-- WHERE "UltimaActualizacion" < NOW() - INTERVAL '24 hours';

-- =====================================================
-- LIMPIEZA DE DATOS ANTIGUOS (Ejecutar mensualmente)
-- =====================================================

-- Comentar/descomentar según política de retención:

-- Eliminar eventos de más de 1 año
-- DELETE FROM eventos WHERE "CreadoEn" < NOW() - INTERVAL '1 year';

-- Eliminar puntos de más de 2 años (opcional, cuidado con historial)
-- DELETE FROM puntos WHERE "CreadoEn" < NOW() - INTERVAL '2 years';

-- =====================================================
-- VERIFICACIÓN DE SALUD
-- =====================================================

-- Mostrar tablas con más filas
SELECT relname as tabla, n_live_tup as filas_aprox
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;

-- Mostrar índices más grandes
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamaño
FROM pg_stat_user_indexes
JOIN pg_index ON indexrelid = pg_index.indexrelid
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- Mostrar tablas con bloat (fragmentación)
SELECT 
    schemaname,
    relname as tabla,
    n_dead_tup as filas_muertas,
    n_live_tup as filas_vivas,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as pct_muerto
FROM pg_stat_user_tables
WHERE n_dead_tup > 100
ORDER BY n_dead_tup DESC
LIMIT 10;

COMMIT;

