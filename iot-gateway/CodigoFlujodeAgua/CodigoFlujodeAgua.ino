/*
 * ========================================
 * AQUAFLOW - Sensor de Flujo de Agua
 * ========================================
 * ESP32 + Sensor YF-S201
 * Envía datos al backend AquaFlow via HTTP
 * 
 * MODO: Registro por evento de uso
 * - Detecta cuando se abre el grifo
 * - Acumula el consumo mientras está abierto
 * - Envía UN registro cuando se cierra
 * ========================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =========================================
// CONFIGURACIÓN - MODIFICAR SEGÚN TU SETUP
// =========================================

// WiFi
const char* WIFI_SSID = "CAMILO 2.4G";
const char* WIFI_PASSWORD = "03112018";

// Backend AquaFlow
const char* BACKEND_URL = "https://aquaflowbackend.azurewebsites.net";
// Para desarrollo local: "http://192.168.18.24:5001"

// Credenciales del dispositivo (se obtienen al registrar el dispositivo)
const char* SENSOR_ID = "ESP32_CAUDAL_001";
const char* API_KEY = "3bI-jHbfN3NQw_RO5DEfXN717YfSXHRXANYYjmndL-tTCGv9NB3u68b4g7mI9MtpWGbunAnFjVdyZ92xZ0R_FQ==";

// Sensor YF-S201
#define PIN_SENSOR 4  // GPIO4 (seguro para interrupciones en ESP32)

// Configuración de detección
#define UMBRAL_FLUJO_MINIMO 0.5    // L/min mínimo para considerar "grifo abierto"
#define TIEMPO_CIERRE_MS 3000      // ms sin flujo para considerar "grifo cerrado"
#define INTERVALO_LECTURA_MS 500   // Leer sensor cada 500ms para mejor precisión

// =========================================
// VARIABLES GLOBALES
// =========================================

// Sensor
volatile unsigned long pulseCount = 0;
unsigned long lastReadTime = 0;
float calibrationFactor = 7.5;  // YF-S201: 7.5 pulsos = 1 L/min

// Estado del grifo
enum EstadoGrifo { CERRADO, ABIERTO };
EstadoGrifo estadoGrifo = CERRADO;

// Datos del evento actual
unsigned long eventoInicio = 0;          // Timestamp cuando se abrió
float eventoLitros = 0;                  // Litros acumulados en este evento
float eventoCaudalMax = 0;               // Caudal máximo registrado
float eventoCaudalSum = 0;               // Suma de caudales (para promedio)
int eventoLecturas = 0;                  // Número de lecturas (para promedio)
unsigned long ultimoFlujoDetectado = 0;  // Última vez que hubo flujo

// Estadísticas globales (desde encendido)
float litrosTotalesGlobal = 0;
int eventosEnviados = 0;

// Conexión
bool wifiConnected = false;

// =========================================
// INTERRUPCIÓN DEL SENSOR
// =========================================
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// =========================================
// FUNCIONES DE CONEXIÓN
// =========================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }

  Serial.print("Conectando a WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✓ WiFi conectado!");
    Serial.print("  IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n✗ Error de conexión WiFi");
  }
}

// =========================================
// ENVÍO DE EVENTO DE USO
// =========================================

bool enviarEventoUso() {
  if (!wifiConnected || eventoLitros < 0.01) return false;  // No enviar si no hay consumo significativo
  
  unsigned long eventoFin = millis();
  float duracionSeg = (eventoFin - eventoInicio) / 1000.0;
  float caudalPromedio = eventoLecturas > 0 ? (eventoCaudalSum / eventoLecturas) : 0;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/sensores/evento";
  
  // Crear JSON
  StaticJsonDocument<384> doc;
  doc["sensorId"] = SENSOR_ID;
  doc["apiKey"] = API_KEY;
  doc["litrosConsumidos"] = round(eventoLitros * 100) / 100.0;  // 2 decimales
  doc["duracionSegundos"] = round(duracionSeg);
  doc["caudalPromedio"] = round(caudalPromedio * 10) / 10.0;    // 1 decimal
  doc["caudalMaximo"] = round(eventoCaudalMax * 10) / 10.0;
  doc["timestampInicio"] = eventoInicio;
  doc["timestampFin"] = eventoFin;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("\n📤 Enviando evento de uso:");
  Serial.print("   Litros: ");
  Serial.print(eventoLitros, 2);
  Serial.print(" L | Duración: ");
  Serial.print(duracionSeg, 1);
  Serial.print("s | Promedio: ");
  Serial.print(caudalPromedio, 1);
  Serial.println(" L/min");
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  int httpCode = http.POST(payload);
  String response = http.getString();
  http.end();
  
  if (httpCode == 200) {
    Serial.println("   ✓ Evento enviado correctamente");
    eventosEnviados++;
    return true;
  } else {
    Serial.print("   ✗ Error HTTP: ");
    Serial.print(httpCode);
    Serial.print(" - ");
    Serial.println(response);
    return false;
  }
}

// =========================================
// LÓGICA DE DETECCIÓN DE EVENTOS
// =========================================

void procesarLectura(float caudalActual) {
  unsigned long ahora = millis();
  
  if (estadoGrifo == CERRADO) {
    // ¿Se abrió el grifo?
    if (caudalActual >= UMBRAL_FLUJO_MINIMO) {
      estadoGrifo = ABIERTO;
      eventoInicio = ahora;
      eventoLitros = 0;
      eventoCaudalMax = 0;
      eventoCaudalSum = 0;
      eventoLecturas = 0;
      
      Serial.println("\n🚿 ¡Grifo ABIERTO! Iniciando registro...");
    }
  }
  
  if (estadoGrifo == ABIERTO) {
    if (caudalActual >= UMBRAL_FLUJO_MINIMO) {
      // Hay flujo, actualizar datos del evento
      ultimoFlujoDetectado = ahora;
      
      // Acumular litros (convertir L/min a L/lectura)
      float intervaloSeg = INTERVALO_LECTURA_MS / 1000.0;
      eventoLitros += (caudalActual / 60.0) * intervaloSeg;
      litrosTotalesGlobal += (caudalActual / 60.0) * intervaloSeg;
      
      // Actualizar estadísticas
      if (caudalActual > eventoCaudalMax) eventoCaudalMax = caudalActual;
      eventoCaudalSum += caudalActual;
      eventoLecturas++;
      
    } else {
      // No hay flujo, ¿ya pasó el tiempo de cierre?
      if (ahora - ultimoFlujoDetectado >= TIEMPO_CIERRE_MS) {
        Serial.println("🚫 Grifo CERRADO. Finalizando evento...");
        
        // Enviar el evento
        if (enviarEventoUso()) {
          // Evento enviado exitosamente
        } else {
          Serial.println("   ⚠️ No se pudo enviar, datos perdidos");
        }
        
        // Resetear estado
        estadoGrifo = CERRADO;
        eventoLitros = 0;
      }
    }
  }
}

// =========================================
// SETUP
// =========================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("   AQUAFLOW - Sensor de Flujo v3.0");
  Serial.println("   Modo: Registro por Evento");
  Serial.println("========================================");
  Serial.print("Sensor ID: ");
  Serial.println(SENSOR_ID);
  
  // Configurar sensor
  pinMode(PIN_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_SENSOR), pulseCounter, FALLING);
  
  // Conectar WiFi
  connectWiFi();
  
  // Verificar backend
  if (wifiConnected) {
    Serial.print("Verificando backend... ");
    HTTPClient http;
    http.begin(String(BACKEND_URL) + "/api/sensores/ping");
    http.setTimeout(5000);
    int code = http.GET();
    http.end();
    
    if (code == 200) {
      Serial.println("✓ Conectado!");
    } else {
      Serial.println("✗ No accesible");
    }
  }
  
  lastReadTime = millis();
  
  Serial.println("----------------------------------------");
  Serial.println("Sistema listo. Esperando uso de agua...");
  Serial.println("----------------------------------------\n");
}

// =========================================
// LOOP PRINCIPAL
// =========================================
void loop() {
  unsigned long currentTime = millis();
  
  // === LECTURA DEL SENSOR (cada 500ms) ===
  if (currentTime - lastReadTime >= INTERVALO_LECTURA_MS) {
    detachInterrupt(PIN_SENSOR);
    
    unsigned long elapsed = currentTime - lastReadTime;
    float frequency = pulseCount / (elapsed / 1000.0);
    float caudalActual = frequency / calibrationFactor;
    
    // Mostrar en Serial solo si hay flujo o si el grifo está abierto
    if (caudalActual >= UMBRAL_FLUJO_MINIMO || estadoGrifo == ABIERTO) {
      Serial.print("💧 Caudal: ");
      Serial.print(caudalActual, 2);
      Serial.print(" L/min");
      
      if (estadoGrifo == ABIERTO) {
        Serial.print(" | Acumulado: ");
        Serial.print(eventoLitros, 2);
        Serial.print(" L");
      }
      Serial.println();
    }
    
    // Procesar la lectura para detectar eventos
    procesarLectura(caudalActual);
    
    // Reset contador
    pulseCount = 0;
    lastReadTime = millis();
    
    attachInterrupt(digitalPinToInterrupt(PIN_SENSOR), pulseCounter, FALLING);
  }
  
  // === RECONEXIÓN WIFI ===
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    if (estadoGrifo == CERRADO) {  // Solo reconectar si no hay evento en curso
      connectWiFi();
    }
  }
  
  // === MOSTRAR ESTADÍSTICAS CADA 60 SEGUNDOS (solo si está inactivo) ===
  static unsigned long lastStats = 0;
  if (estadoGrifo == CERRADO && currentTime - lastStats >= 60000) {
    Serial.print("📊 Stats: ");
    Serial.print(litrosTotalesGlobal, 2);
    Serial.print(" L totales | ");
    Serial.print(eventosEnviados);
    Serial.println(" eventos enviados");
    lastStats = currentTime;
  }
  
  delay(10);
}
