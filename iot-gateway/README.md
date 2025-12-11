# 🌊 AquaFlow IoT Gateway

Este directorio contiene el código para los sensores IoT del sistema AquaFlow.

## 📋 Arquitectura

```
ESP32 + YF-S201  ──HTTP──►  Backend .NET  ──►  InfluxDB Cloud
     │                           │
     │                           ▼
     │                    PostgreSQL (metadata)
     │                           │
     └──────────────────────────┴──►  Frontend React
```

## 🔧 Hardware Requerido

- **ESP32** (DevKit v1 o similar)
- **Sensor YF-S201** (sensor de flujo de agua)
- Cables jumper
- Fuente de alimentación 5V

### Conexiones

| YF-S201 | ESP32 |
|---------|-------|
| VCC (rojo) | 5V |
| GND (negro) | GND |
| Signal (amarillo) | GPIO4 |

## 🚀 Configuración del ESP32

### 1. Instalar Dependencias

En Arduino IDE, instalar las siguientes librerías:
- **ArduinoJson** (by Benoit Blanchon) - v6.x
- **WiFi** (incluida en ESP32 core)
- **HTTPClient** (incluida en ESP32 core)

### 2. Configurar el Board

1. Ir a `File -> Preferences`
2. En "Additional Boards Manager URLs", agregar:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Ir a `Tools -> Board -> Boards Manager`
4. Buscar "esp32" e instalar "ESP32 by Espressif Systems"
5. Seleccionar `Tools -> Board -> ESP32 Dev Module`

### 3. Registrar el Dispositivo en AquaFlow

Antes de configurar el ESP32, debes registrar el dispositivo en el backend:

```bash
# Ejemplo con curl (requiere token JWT de director/admin)
curl -X POST https://tu-backend.azurewebsites.net/api/sensores/dispositivos \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Sensor Baño Principal",
    "sensorId": "ESP32_CAUDAL_001",
    "tipoSensor": "YF-S201",
    "espacioId": 1,
    "descripcion": "Sensor de flujo en baño del primer piso"
  }'
```

La respuesta incluirá el `apiKey` que necesitas para el ESP32:

```json
{
  "id": 1,
  "nombre": "Sensor Baño Principal",
  "sensorId": "ESP32_CAUDAL_001",
  "apiKey": "abc123xyz789...",  // ⚠️ GUARDAR ESTE VALOR
  "tipoSensor": "YF-S201",
  "espacioId": 1,
  "nombreEspacio": "Baño Principal",
  "colegioId": 1,
  "estado": "activo",
  "fechaCreacion": "2025-12-11T..."
}
```

### 4. Configurar el Código

Editar `CodigoFlujodeAgua.ino` y modificar estas constantes:

```cpp
// WiFi
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD_WIFI";

// Backend AquaFlow
const char* BACKEND_URL = "https://tu-backend.azurewebsites.net";

// Credenciales del dispositivo
const char* SENSOR_ID = "ESP32_CAUDAL_001";  // Mismo que usaste al registrar
const char* API_KEY = "abc123xyz789...";     // El apiKey que te devolvió el registro
```

### 5. Subir el Código

1. Conectar el ESP32 por USB
2. Seleccionar el puerto correcto en `Tools -> Port`
3. Click en `Upload`

## 📡 Endpoints del Backend

### Para el ESP32

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/sensores/ping` | Health check |
| `POST` | `/api/sensores/flow` | Enviar lectura individual |
| `POST` | `/api/sensores/flow/batch` | Enviar múltiples lecturas |

### Para el Frontend

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/sensores/{sensorId}/data` | Datos históricos |
| `GET` | `/api/sensores/consumo/colegio/{id}` | Resumen de consumo |
| `GET` | `/api/sensores/colegio/{id}` | Lista de sensores |
| `POST` | `/api/sensores/dispositivos` | Registrar dispositivo |
| `POST` | `/api/sensores/dispositivos/{id}/regenerar-key` | Nueva API Key |

## 📊 Datos Enviados

El ESP32 envía datos en formato JSON cada 10 segundos:

```json
{
  "sensorId": "ESP32_CAUDAL_001",
  "apiKey": "abc123...",
  "caudalLmin": 5.23,
  "litrosTotales": 150.45,
  "frecuencia": 39.2
}
```

## 🔄 Modo Offline

Si el ESP32 pierde conexión:

1. Los datos se almacenan en un buffer interno (hasta 60 lecturas)
2. Cuando se recupera la conexión, se envían en batch
3. Si el buffer se llena, se descartan las lecturas más antiguas

## 📈 InfluxDB Cloud

Los datos se almacenan en InfluxDB con el siguiente esquema:

```
Measurement: flujo_agua
Tags:
  - sensor_id
  - colegio_id
  - espacio_id
  - dispositivo_id
  - aula_id (opcional)
Fields:
  - caudal_lmin (float)
  - litros_totales (float)
  - frecuencia_hz (float)
```

### Ejemplo de Query Flux

```flux
from(bucket: "aquaflow_sensors")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "flujo_agua")
  |> filter(fn: (r) => r.sensor_id == "ESP32_CAUDAL_001")
  |> filter(fn: (r) => r._field == "caudal_lmin")
  |> aggregateWindow(every: 1h, fn: mean)
```

## 🔧 Calibración del Sensor

El sensor YF-S201 tiene un factor de calibración por defecto de 7.5 (450 pulsos = 1 litro).

Para calibrar:
1. Medir un volumen conocido de agua (ej: 1 litro)
2. Contar los pulsos durante esa medición
3. Calcular: `nuevo_factor = pulsos / litros`
4. Actualizar `calibrationFactor` en el código

## 🐛 Troubleshooting

### El ESP32 no conecta al WiFi
- Verificar SSID y contraseña
- El ESP32 solo soporta WiFi 2.4GHz

### Error 401 (Unauthorized)
- Verificar que el `sensorId` y `apiKey` son correctos
- Regenerar el API Key desde el panel de administración

### No llegan datos a InfluxDB
- Verificar variables de entorno en el backend
- Revisar logs del backend para errores
- Comprobar que el bucket existe en InfluxDB Cloud

### Lecturas erráticas del sensor
- Verificar conexiones físicas
- Asegurar que el sensor esté instalado en dirección correcta del flujo
- Recalibrar si es necesario

## 📄 Licencia

MIT License - AquaFlow Project

