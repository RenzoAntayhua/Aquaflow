BEGIN;

-- Tablas temporales para carga masiva
DROP TABLE IF EXISTS tmp_departamentos;
DROP TABLE IF EXISTS tmp_provincias;
DROP TABLE IF EXISTS tmp_distritos;

CREATE TEMP TABLE tmp_departamentos (
  codigo_ubigeo_2 CHAR(2) NOT NULL,
  nombre TEXT NOT NULL
);

CREATE TEMP TABLE tmp_provincias (
  codigo_ubigeo_4 CHAR(4) NOT NULL,
  nombre TEXT NOT NULL,
  departamento_codigo_2 CHAR(2) NOT NULL
);

CREATE TEMP TABLE tmp_distritos (
  codigo_ubigeo_6 CHAR(6) NOT NULL,
  nombre TEXT NOT NULL,
  provincia_codigo_4 CHAR(4) NOT NULL
);

-- Ajusta rutas si ejecutas psql desde otro directorio
\copy tmp_departamentos (codigo_ubigeo_2, nombre) FROM 'backend/AquaFlow.Api/Data/Ubigeo/departamentos.csv' WITH (FORMAT csv, DELIMITER ';');
\copy tmp_provincias (codigo_ubigeo_4, nombre, departamento_codigo_2) FROM 'backend/AquaFlow.Api/Data/Ubigeo/provincias.csv' WITH (FORMAT csv, DELIMITER ';', HEADER true);
\copy tmp_distritos (codigo_ubigeo_6, nombre, provincia_codigo_4) FROM 'backend/AquaFlow.Api/Data/Ubigeo/distritos.csv' WITH (FORMAT csv, DELIMITER ';', HEADER true);

-- Departamentos
INSERT INTO departamentos (nombre, codigo_ubigeo, estado)
SELECT DISTINCT
  UPPER(TRIM(td.nombre)) AS nombre,
  td.codigo_ubigeo_2 AS codigo_ubigeo,
  'activo' AS estado
FROM tmp_departamentos td
ON CONFLICT (codigo_ubigeo) DO NOTHING;

-- Provincias
INSERT INTO provincias (departamento_id, nombre, codigo_ubigeo, estado)
SELECT
  d.id_departamento AS departamento_id,
  UPPER(TRIM(tp.nombre)) AS nombre,
  tp.codigo_ubigeo_4 AS codigo_ubigeo,
  'activo' AS estado
FROM tmp_provincias tp
JOIN departamentos d ON d.codigo_ubigeo = tp.departamento_codigo_2
ON CONFLICT (codigo_ubigeo) DO NOTHING;

-- Distritos
INSERT INTO distritos (provincia_id, nombre, codigo_ubigeo, estado)
SELECT
  p.id_provincia AS provincia_id,
  UPPER(TRIM(td.nombre)) AS nombre,
  td.codigo_ubigeo_6 AS codigo_ubigeo,
  'activo' AS estado
FROM tmp_distritos td
JOIN provincias p ON p.codigo_ubigeo = td.provincia_codigo_4
ON CONFLICT (codigo_ubigeo) DO NOTHING;

-- Validaciones rápidas (esperados aprox: 25, ~196, ~1874)
SELECT COUNT(*) AS departamentos_cargados FROM departamentos;
SELECT COUNT(*) AS provincias_cargadas FROM provincias;
SELECT COUNT(*) AS distritos_cargados FROM distritos;

COMMIT;