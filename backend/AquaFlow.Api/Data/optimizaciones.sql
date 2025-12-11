-- =====================================================
-- AQUAFLOW - SCRIPT DE OPTIMIZACIÓN DE BASE DE DATOS
-- Ejecutar en PostgreSQL para mejorar el rendimiento
-- =====================================================

-- NOTA: EF Core por defecto usa PascalCase para columnas en PostgreSQL
-- Si tu esquema usa snake_case, ajusta los nombres de columnas

-- =====================================================
-- 1. ÍNDICES PARA USUARIOS (Tabla más consultada)
-- =====================================================

-- Índice único para email ya debería existir
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_rol 
ON usuarios ("Rol");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_colegio_id 
ON usuarios ("ColegioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_rol_colegio 
ON usuarios ("Rol", "ColegioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_estado 
ON usuarios ("Estado");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_creado_desc 
ON usuarios ("CreadoEn" DESC);

-- =====================================================
-- 2. ÍNDICES PARA AULAS
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aulas_colegio_id 
ON aulas ("ColegioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aulas_profesor_id 
ON aulas ("ProfesorId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aulas_colegio_nombre 
ON aulas ("ColegioId", "Nombre");

-- =====================================================
-- 3. ÍNDICES PARA INSCRIPCIONES (JOIN frecuentes)
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inscripciones_aula_id 
ON inscripciones ("AulaId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inscripciones_estudiante_id 
ON inscripciones ("EstudianteId");

-- Índice compuesto para verificar inscripciones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inscripciones_aula_estudiante 
ON inscripciones ("AulaId", "EstudianteId");

-- =====================================================
-- 4. ÍNDICES PARA PUNTOS (Agregaciones frecuentes)
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_puntos_usuario_id 
ON puntos ("UsuarioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_puntos_aula_id 
ON puntos ("AulaId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_puntos_colegio_id 
ON puntos ("ColegioId");

-- Para SUM de puntos por usuario ordenado por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_puntos_usuario_creado 
ON puntos ("UsuarioId", "CreadoEn" DESC);

-- =====================================================
-- 5. ÍNDICES PARA EVENTOS (Auditoría y filtros)
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_tipo 
ON eventos ("Tipo");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_usuario_id 
ON eventos ("UsuarioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_colegio_id 
ON eventos ("ColegioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_creado_desc 
ON eventos ("CreadoEn" DESC);

-- Índice compuesto para consultas de auditoría
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_colegio_tipo_creado 
ON eventos ("ColegioId", "Tipo", "CreadoEn" DESC);

-- Índice para buscar eventos de usuario por tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_usuario_tipo 
ON eventos ("UsuarioId", "Tipo");

-- =====================================================
-- 6. ÍNDICES PARA PERFIL ESTUDIANTE AGREGADO
-- =====================================================

-- Ya tiene índice único en UsuarioId, agregar para ordenamiento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perfil_estudiante_monedas 
ON perfil_estudiante_aggs ("MonedasTotal" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perfil_estudiante_ultima_act 
ON perfil_estudiante_aggs ("UltimaActualizacion");

-- =====================================================
-- 7. ÍNDICES PARA RETOS AULA
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retos_aula_aula_id 
ON retos_aula ("AulaId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retos_aula_estado 
ON retos_aula ("Estado");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retos_aula_fechas 
ON retos_aula ("FechaInicio", "FechaFin");

-- Índice para retos activos de un aula
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retos_aula_aula_estado 
ON retos_aula ("AulaId", "Estado");

-- =====================================================
-- 8. ÍNDICES PARA INSIGNIAS USUARIO
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insignias_usuario_usuario_id 
ON insignias_usuario ("UsuarioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insignias_usuario_estado 
ON insignias_usuario ("Estado");

-- Índice para obtener insignias aprobadas de un usuario
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insignias_usuario_usuario_estado 
ON insignias_usuario ("UsuarioId", "Estado");

-- =====================================================
-- 9. ÍNDICES PARA PREGUNTAS
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preguntas_activa 
ON preguntas ("Activa");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preguntas_colegio_id 
ON preguntas ("ColegioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preguntas_creador_id 
ON preguntas ("CreadorId");

-- Ya existe índice compuesto (Tipo, Categoria, Dificultad, Activa)

-- =====================================================
-- 10. ÍNDICES PARA ESPACIOS
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_espacios_colegio_id 
ON espacios ("ColegioId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_espacios_tipo 
ON espacios ("Tipo");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_espacios_aula_id 
ON espacios ("AulaId");

-- =====================================================
-- 11. ÍNDICES PARA COLEGIOS
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colegios_estado 
ON colegios (estado);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colegios_distrito_id 
ON colegios (distrito_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colegios_nivel 
ON colegios (nivel);

-- =====================================================
-- 12. ÍNDICES PARA UBIGEO (Dropdowns)
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departamentos_estado 
ON departamentos (estado);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provincias_departamento 
ON provincias (departamento_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provincias_estado 
ON provincias (estado);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_distritos_provincia 
ON distritos (provincia_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_distritos_estado 
ON distritos (estado);

-- =====================================================
-- 13. ÍNDICES PARA CONSUMOS AGREGADOS
-- =====================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consumos_aula_periodo 
ON consumos_agregados ("AulaId", "Periodo", "InicioPeriodo" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consumos_colegio_periodo 
ON consumos_agregados ("ColegioId", "Periodo", "InicioPeriodo" DESC);

-- =====================================================
-- 14. ÍNDICES PARCIALES (Optimización avanzada)
-- =====================================================

-- Solo usuarios activos (la mayoría de consultas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_activos 
ON usuarios ("Id", "Email", "Nombre", "Rol", "ColegioId") 
WHERE "Estado" = 'activo';

-- Solo retos activos (Estado = 0 es 'activo' en el enum)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retos_activos 
ON retos_aula ("AulaId", "FechaInicio", "FechaFin") 
WHERE "Estado" = 0;

-- Solo preguntas activas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preguntas_activas 
ON preguntas ("Id", "Texto", "Tipo", "Categoria", "Dificultad") 
WHERE "Activa" = true;

-- Solo insignias aprobadas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insignias_aprobadas 
ON insignias_usuario ("UsuarioId", "InsigniaId", "OtorgadaEn") 
WHERE "Estado" = 'aprobada';

-- =====================================================
-- 15. ÍNDICES GIN PARA BÚSQUEDA EN JSON (Opcional)
-- =====================================================

-- Descomentar si necesitas buscar dentro del JSON de Payload
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_payload_gin 
-- ON eventos USING GIN ((CAST("Payload" AS jsonb)));

-- =====================================================
-- 16. ACTUALIZAR ESTADÍSTICAS
-- =====================================================

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
ANALYZE departamentos;
ANALYZE provincias;
ANALYZE distritos;
ANALYZE consumos_agregados;
ANALYZE plantillas_retos;
ANALYZE insignias;

-- =====================================================
-- 17. MANTENIMIENTO (Ejecutar periódicamente)
-- =====================================================

-- Eliminar tokens de recuperación expirados
DELETE FROM recuperacion_tokens WHERE "ExpiraEn" < NOW();

-- =====================================================
-- 18. CONFIGURACIÓN DE POSTGRESQL (Opcional - requiere superuser)
-- =====================================================

-- Para mejorar rendimiento general, ajustar en postgresql.conf:
-- shared_buffers = 256MB (25% de RAM disponible)
-- effective_cache_size = 1GB (50-75% de RAM disponible)
-- work_mem = 64MB
-- maintenance_work_mem = 256MB
-- random_page_cost = 1.1 (para SSD)
-- effective_io_concurrency = 200 (para SSD)

-- =====================================================
-- 19. VERIFICAR ÍNDICES CREADOS
-- =====================================================

-- Ver todos los índices de una tabla:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'usuarios';

-- Ver tamaño de índices:
-- SELECT pg_size_pretty(pg_indexes_size('usuarios')) as index_size;

-- Ver índices no utilizados (ejecutar después de uso real):
-- SELECT schemaname, relname, indexrelname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_%';

-- =====================================================
-- 20. VACUUM (Mantenimiento periódico)
-- =====================================================

-- Ejecutar semanalmente para liberar espacio y actualizar estadísticas:
-- VACUUM ANALYZE;

-- Para tablas con muchas actualizaciones/eliminaciones:
-- VACUUM FULL usuarios;
-- VACUUM FULL eventos;
-- VACUUM FULL puntos;

COMMIT;
