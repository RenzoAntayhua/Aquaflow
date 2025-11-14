# 🌊 Proyecto IoT Educativo: “Conciencia del Uso del Agua”

## 🎯 Objetivo General

Desarrollar un sistema interactivo basado en juegos y sensores IoT que mida el consumo de agua en instituciones educativas y promueva el uso responsable a través de gamificación.

---

## 🧩 FASE 1: Análisis y Diseño del Sistema

### 🎯 Objetivo

Definir claramente los requerimientos funcionales, la arquitectura y los componentes principales.

### 🧠 Tareas

1. **Levantamiento de requerimientos**

   * Identificar actores: estudiantes, docentes, administrador del sistema.
   * Definir casos de uso: registro, monitoreo de consumo, visualización de ranking, logros.
   * Establecer KPIs ambientales (por ejemplo: consumo por estudiante, aula, colegio).

2. **Definición de arquitectura general**

   * IoT → Gateway → Backend API → Base de datos InfluxDB → Frontend Web.
   * Fallback local en caso de pérdida de conexión.

3. **Diseño del modelo de datos**

   * Datos de sensores (InfluxDB).
   * Datos de usuarios, colegios, logros y ranking (base SQL ligera: PostgreSQL o SQLite).
   * Relaciones entre ambos.

4. **Diseño de interfaz (wireframes)**

   * Mockups: panel de estudiante, vista del docente, ranking por aula/colegio.

---

## ⚙️ FASE 2: Infraestructura IoT

### 🎯 Objetivo

Configurar los sensores y establecer la comunicación con el sistema.

### 🧠 Tareas

1. **Configuración de sensores**

   * YF-S201 (flujo de agua)
   * FC-28 (humedad)
   * Transductor 0–1.2 MPa (presión)
   * Microcontrolador: ESP32 o ESP8266.

2. **Comunicación**

   * Implementar protocolo LoRa o Wi-Fi.
   * Envío de datos en formato JSON o MQTT hacia el servidor IoT Gateway.

3. **Servidor IoT Gateway**

   * Pequeña app en Python o Node.js que reciba los datos.
   * Inserción directa en InfluxDB.
   * Manejo de buffer offline si se pierde conexión con la nube.

---

## 🧮 FASE 3: Backend y Base de Datos

### 🎯 Objetivo

Desarrollar el backend que gestione los datos de los usuarios y comunique el sistema IoT con el frontend.

### 🧠 Tareas

1. **Diseño de API REST**

   * Endpoints: `/api/sensores`, `/api/usuarios`, `/api/logros`, `/api/ranking`.
   * Autenticación básica (JWT o tokens por aula/colegio).
   * Lenguaje: **Python (FastAPI)** o **Node.js (Express)**.

2. **Base de datos**

   * **InfluxDB**: registro temporal del consumo de agua por sensor.
   * **PostgreSQL/SQLite**: usuarios, colegios, logros, metas y rankings.
   * Integración entre ambas mediante scripts de sincronización.

3. **Cálculo de métricas**

   * Consumo promedio diario/semanal/mensual.
   * Ranking por aula/colegio.
   * Logros (insignias) según metas de ahorro.

---

## 💻 FASE 4: Frontend Educativo Gamificado

### 🎯 Objetivo

Diseñar la experiencia web interactiva para estudiantes y docentes.

### 🧠 Tareas

1. **Diseño de interfaz web**

   * Framework: **React + Tailwind CSS** (ligero, educativo y compatible con navegadores escolares).
   * Panel de métricas: gráficos (Chart.js / Recharts) conectados a la API.
   * Páginas principales:

     * 🧍‍♂️ Estudiante: progreso, insignias, comparación mensual.
     * 🧑‍🏫 Docente: panel general del aula, logros colectivos.
     * 🏫 Colegio: ranking general, consumo total.

2. **Gamificación**

   * Sistema de niveles y puntos.
   * Logros visuales e insignias.
   * Ranking global por aula o colegio.

3. **Educación interactiva**

   * Sección de retos y trivias relacionadas con el agua.
   * Retroalimentación inmediata según consumo.

---

## ☁️ FASE 5: Despliegue y Pruebas Piloto

### 🎯 Objetivo

Asegurar que el sistema funcione en entorno real y recopilar retroalimentación.

### 🧠 Tareas

1. **Despliegue inicial**

   * Backend + InfluxDB en la nube (AWS Free Tier o Railway.app).
   * Frontend web en Netlify o Vercel.
   * Configuración del dominio institucional.

2. **Prueba piloto**

   * Implementar en un colegio de Tacna.
   * Monitoreo en tiempo real de sensores.
   * Recolección de feedback de estudiantes/docentes.

3. **Optimización**

   * Ajuste de métricas y retos educativos.
   * Corrección de latencias y fallas de conexión.

---

## 🚀 FASE 6: Escalabilidad y Expansión Regional

### 🎯 Objetivo

Optimizar la plataforma para escalar hacia otras regiones del sur del Perú.

### 🧠 Tareas

1. **Optimización en la nube**

   * Migrar a AWS IoT Core o Azure IoT Hub (según presupuesto futuro).
   * Uso de contenedores (Docker) para backend y gateway.
   * Monitoreo con Grafana Cloud.

2. **Módulos nuevos**

   * Panel de impacto ambiental (métrica de litros ahorrados).
   * Sistema de insignias regionales y eventos.
   * Integración con redes sociales o portal educativo regional.

---

## 🧱 RESUMEN DE TECNOLOGÍAS PROPUESTAS

| Capa                      | Tecnología                           | Motivo                                             |
| ------------------------- | ------------------------------------ | -------------------------------------------------- |
| IoT                       | ESP32 + LoRa/Wi-Fi                   | Económico, eficiente y ampliamente documentado     |
| Gateway                   | Python (MQTT o FastAPI)              | Ligero y fácil de conectar con InfluxDB            |
| Backend                   | FastAPI (Python) o Express (Node.js) | Escalable, RESTful y de bajo costo                 |
| Base de Datos Tiempo Real | InfluxDB                             | Ideal para series temporales de sensores           |
| Base de Datos Relacional  | PostgreSQL / SQLite                  | Para usuarios, logros y rankings                   |
| Frontend                  | React + Bootstrap                    | Interactivo, moderno y compatible con PC escolares |
| Despliegue                | AWS Free Tier / Vercel / Railway     | Gratuito o bajo costo, fácil de escalar            |
