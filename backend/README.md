# Backend (ASP.NET Core)

- API en ASP.NET Core (.NET 8) con endpoints mínimos para colegios, aulas, plantillas y retos.
- EF Core con PostgreSQL (tablas en español). Lecturas crudas de sensores se manejarán en InfluxDB en una fase posterior.

## Variables de entorno

Crear `backend/AquaFlow.Api/.env` basado en `backend/AquaFlow.Api/.env.example`:

- `POSTGRES_CONNECTION_STRING`
- `CORS_ALLOWED_ORIGIN`
- `INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, `INFLUX_BUCKET` (reservadas para integración posterior)

## Ejecutar local

1. Restaurar paquetes: `dotnet restore` en `backend/AquaFlow.Api`.
2. Ejecutar: `dotnet run` (por defecto en `http://localhost:5000` o puerto asignado).

## Seed de UBIGEO (Perú)

Para cargar el catálogo oficial de Departamentos, Provincias y Distritos:

1. Ubica los CSV en `backend/AquaFlow.Api/Data/Ubigeo/`:
   - `departamentos.csv` (incluido, 25 reales)
   - `provincias.csv` (`codigo_ubigeo_4;nombre;codigo_departamento_2`)
   - `distritos.csv` (`codigo_ubigeo_6;nombre;codigo_provincia_4`)

2. Ejecuta el script SQL con `psql`:
   - `psql -d <TU_DB> -f backend/AquaFlow.Api/Data/Ubigeo/seed_ubigeo.sql`

3. Conteos esperados (aprox):
   - Departamentos: `25`
   - Provincias: `~196`
   - Distritos: `~1874`

Notas:
- Los CSV deben provenir del catálogo oficial INEI/RENIEC. El script es idempotente (no duplica por claves `codigo_ubigeo`).
- Si ejecutas `psql` desde otra carpeta, ajusta las rutas del `\copy` en `seed_ubigeo.sql`.

### Ampliación con datos oficiales (URLs remotas)
- También puedes cargar automáticamente desde URLs públicas sin copiar archivos al repo.
- Variables soportadas por la API en arranque:
  - `SEED_UBIGEO_DEPARTAMENTOS_URL` → CSV con columnas `inei` (2 dígitos) y `departamento`.
  - `SEED_UBIGEO_PROVINCIAS_URL` → CSV con columnas `inei` (4 dígitos) y `provincia`.
  - `SEED_UBIGEO_DISTRITOS_URL` → CSV con columnas `inei` (6 dígitos) y `distrito`.
- Ejemplo (PowerShell):
  `setx SEED_UBIGEO true; setx ASPNETCORE_URLS http://localhost:5000; setx SEED_UBIGEO_DEPARTAMENTOS_URL https://raw.githubusercontent.com/jmcastagnetto/ubigeo-peru-aumentado/master/data/ubigeo_departamento.csv; setx SEED_UBIGEO_PROVINCIAS_URL https://raw.githubusercontent.com/jmcastagnetto/ubigeo-peru-aumentado/master/data/ubigeo_provincia.csv; setx SEED_UBIGEO_DISTRITOS_URL https://raw.githubusercontent.com/jmcastagnetto/ubigeo-peru-aumentado/master/data/ubigeo_distrito.csv`
  Reinicia la API después de configurar las variables.

Notas:
- Los nombres se almacenan en MAYÚSCULAS para consistencia.
- Códigos se basan en INEI; el seeder resuelve relaciones por prefijo (`provincia` → primeros 2 dígitos; `distrito` → primeros 4 dígitos de `inei`).

## Autenticación (MVP)

Endpoints:
- `POST /auth/registrar` cuerpo `{ nombre, email, password, rol, colegioId? }`
- `POST /auth/login` cuerpo `{ email, password }` → devuelve `{ token, usuario }`
- `POST /auth/password/reset/solicitar` cuerpo `{ email }` → genera token (en MVP lo devuelve)
- `POST /auth/password/reset/confirmar` cuerpo `{ token, newPassword }`

Variables `.env` relevantes:
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `CORS_ALLOWED_ORIGIN`