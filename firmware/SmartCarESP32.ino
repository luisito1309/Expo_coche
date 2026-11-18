/*
 * =====================================================================================
 * PROYECTO: SMART CAR ESP32
 * FIRMWARE ROBOT COCHE CON CONTROL BLUETOOTH CLASSIC (SPP) Y DRIVER L298N
 * 
 * Microcontrolador: ESP32-WROOM-32 (ESP32 DevKit V1)
 * Driver de Motores: L298N
 * Protocolo: Bluetooth Classic SPP (BluetoothSerial.h)
 * Nombre del Dispositivo Bluetooth: "SmartCarESP32"
 * 
 * CONEXIONES DE PINES ESP32 -> L298N:
 * -------------------------------------------------------------------------------------
 * Motor Izquierdo:
 *   IN1 -> GPIO 25 (Dirección)
 *   IN2 -> GPIO 26 (Dirección)
 *   ENA -> GPIO 33 (PWM Velocidad)  *IMPORTANTE: Retirar jumper ENA del L298N*
 * 
 * Motor Derecho:
 *   IN3 -> GPIO 27 (Dirección)
 *   IN4 -> GPIO 14 (Dirección)
 *   ENB -> GPIO 32 (PWM Velocidad)  *IMPORTANTE: Retirar jumper ENB del L298N*
 * 
 * Tierra Común:
 *   GND del ESP32 -> GND del L298N (Esencial para referencia lógica común)
 * =====================================================================================
 */

#include "BluetoothSerial.h"
#include "esp_arduino_version.h"

// -----------------------------------------------------------------------------
// DEFINICIÓN DE PINES
// -----------------------------------------------------------------------------
#define IN1 25  // Motor izquierdo avance
#define IN2 26  // Motor izquierdo retroceso
#define ENA 33  // PWM Motor izquierdo

#define IN3 27  // Motor derecho avance
#define IN4 14  // Motor derecho retroceso
#define ENB 32  // PWM Motor derecho

// Pin de LED integrado para indicación de estado (GPIO 2 en la mayoría de DevKits)
#define LED_PIN 2

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DE PWM Y CANALES (Compatibilidad Core 2.x y Core 3.x)
// -----------------------------------------------------------------------------
#define PWM_FREQ 1000        // Frecuencia PWM en Hz (óptimo para motores DC con L298N)
#define PWM_RESOLUTION 8     // Resolución de 8 bits (0 - 255)
#define PWM_CHANNEL_ENA 0    // Canal LEDC para ENA (Core 2.x)
#define PWM_CHANNEL_ENB 1    // Canal LEDC para ENB (Core 2.x)

// -----------------------------------------------------------------------------
// CONSTANTES DE COMUNICACIÓN Y SEGURIDAD
// -----------------------------------------------------------------------------
const char* BT_DEVICE_NAME = "SmartCarESP32";
const unsigned long WATCHDOG_TIMEOUT_MS = 700; // Parada si no hay comandos en 700ms

// -----------------------------------------------------------------------------
// VARIABLES GLOBALES
// -----------------------------------------------------------------------------
BluetoothSerial SerialBT;

char currentCommand = 'S';
int currentSpeed = 180;             // Velocidad inicial predeterminada (0-255)
unsigned long lastCommandTime = 0;  // Marca de tiempo para el watchdog
bool isClientConnected = false;     // Estado de enlace Bluetooth
String rxBuffer = "";               // Búfer para comandos de velocidad

// -----------------------------------------------------------------------------
// FUNCIONES DE CONTROL PWM (ABSTRACCIÓN MULTI-VERSIÓN CORE)
// -----------------------------------------------------------------------------
void initMotorsPWM() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  digitalWrite(LED_PIN, LOW);

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  // Sintaxis Arduino-ESP32 Core 3.0+
  ledcAttach(ENA, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(ENB, PWM_FREQ, PWM_RESOLUTION);
  ledcWrite(ENA, 0);
  ledcWrite(ENB, 0);
#else
  // Sintaxis Arduino-ESP32 Core 2.x
  ledcSetup(PWM_CHANNEL_ENA, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(PWM_CHANNEL_ENB, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(ENA, PWM_CHANNEL_ENA);
  ledcAttachPin(ENB, PWM_CHANNEL_ENB);
  ledcWrite(PWM_CHANNEL_ENA, 0);
  ledcWrite(PWM_CHANNEL_ENB, 0);
#endif
}

void applyMotorPWM(int speedLeft, int speedRight) {
  speedLeft = constrain(speedLeft, 0, 255);
  speedRight = constrain(speedRight, 0, 255);

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcWrite(ENA, speedLeft);
  ledcWrite(ENB, speedRight);
#else
  ledcWrite(PWM_CHANNEL_ENA, speedLeft);
  ledcWrite(PWM_CHANNEL_ENB, speedRight);
#endif
}

// -----------------------------------------------------------------------------
// FUNCIONES DE MOVIMIENTO FÍSICO
// -----------------------------------------------------------------------------

// Detener inmediatamente ambos motores
void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  applyMotorPWM(0, 0);
  currentCommand = 'S';
}

// Avanzar adelante
void moveForward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyMotorPWM(currentSpeed, currentSpeed);
  currentCommand = 'F';
}

// Retroceder
void moveBackward() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  applyMotorPWM(currentSpeed, currentSpeed);
  currentCommand = 'B';
}

// Girar hacia la izquierda (giro sobre su propio eje)
void turnLeft() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH); // Motor izquierdo retrocede
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);  // Motor derecho avanza
  applyMotorPWM(currentSpeed, currentSpeed);
  currentCommand = 'L';
}

// Girar hacia la derecha (giro sobre su propio eje)
void turnRight() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);  // Motor izquierdo avanza
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH); // Motor derecho retrocede
  applyMotorPWM(currentSpeed, currentSpeed);
  currentCommand = 'R';
}

// -----------------------------------------------------------------------------
// CALLBACK DE EVENTOS BLUETOOTH SERIAL (CONEXIÓN / DESCONEXIÓN)
// -----------------------------------------------------------------------------
void btCallback(esp_spp_cb_event_t event, esp_spp_cb_param_t *param) {
  if (event == ESP_SPP_SRV_OPEN_EVT) {
    // Cliente Android conectado
    isClientConnected = true;
    digitalWrite(LED_PIN, HIGH);
    stopMotors();
    lastCommandTime = millis();
    Serial.println("[BT] Cliente Android Conectado");
    SerialBT.println("READY");
  } else if (event == ESP_SPP_CLOSE_EVT) {
    // Cliente Android desconectado
    isClientConnected = false;
    digitalWrite(LED_PIN, LOW);
    stopMotors();
    Serial.println("[BT] Cliente Android Desconectado -> Motores detenidos");
  }
}

// -----------------------------------------------------------------------------
// PROCESAMIENTO DE COMANDOS
// -----------------------------------------------------------------------------
void processCommand(char cmd) {
  lastCommandTime = millis(); // Alimentar watchdog

  switch (cmd) {
    case 'F':
      moveForward();
      SerialBT.println("OK:F");
      break;

    case 'B':
      moveBackward();
      SerialBT.println("OK:B");
      break;

    case 'L':
      turnLeft();
      SerialBT.println("OK:L");
      break;

    case 'R':
      turnRight();
      SerialBT.println("OK:R");
      break;

    case 'S':
      stopMotors();
      SerialBT.println("OK:S");
      break;

    default:
      SerialBT.print("ERR:UNKNOWN_");
      SerialBT.println(cmd);
      break;
  }
}

// Procesar comando de velocidad delimitado (ej. V180\n)
void processSpeedString(String s) {
  s.trim();
  if (s.startsWith("V") || s.startsWith("v")) {
    int val = s.substring(1).toInt();
    val = constrain(val, 0, 255);
    currentSpeed = val;
    lastCommandTime = millis();

    // Actualizar PWM en tiempo real si el coche está en movimiento
    if (currentCommand != 'S') {
      applyMotorPWM(currentSpeed, currentSpeed);
    }

    SerialBT.print("OK:V");
    SerialBT.println(currentSpeed);
    Serial.printf("[SPEED] Nueva velocidad configurada: %d\n", currentSpeed);
  }
}

// -----------------------------------------------------------------------------
// CONFIGURACIÓN INICIAL (SETUP)
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("=========================================");
  Serial.println("  INICIALIZANDO SMART CAR ESP32...");
  Serial.println("=========================================");

  // Inicializar periféricos y motores
  initMotorsPWM();
  stopMotors();

  // Registrar callback para detectar conexión y desconexión
  SerialBT.register_callback(btCallback);

  // Inicializar Bluetooth Classic con el nombre solicitado
  if (!SerialBT.begin(BT_DEVICE_NAME)) {
    Serial.println("[ERROR] No se pudo inicializar Bluetooth Classic.");
    while (true) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      delay(200);
    }
  }

  Serial.printf("[BT] Dispositivo \"%s\" iniciado y visible para emparejar.\n", BT_DEVICE_NAME);
  Serial.println("[SISTEMA] Listo para recibir conexiones.");
}

// -----------------------------------------------------------------------------
// BUCLE PRINCIPAL (LOOP)
// -----------------------------------------------------------------------------
void loop() {
  // 1. WATCHDOG DE SEGURIDAD
  // Si el coche está en movimiento y transcurren más de WATCHDOG_TIMEOUT_MS (700ms)
  // sin recibir comandos de la app, detener inmediatamente los motores.
  if (currentCommand != 'S') {
    if (millis() - lastCommandTime > WATCHDOG_TIMEOUT_MS) {
      stopMotors();
      Serial.println("[WATCHDOG] Timeout superado: Motores detenidos por seguridad.");
    }
  }

  // 2. LECTURA Y PROCESAMIENTO BLUETOOTH
  while (SerialBT.available()) {
    char c = (char)SerialBT.read();

    // Si es un comando de movimiento de un solo carácter
    if (c == 'F' || c == 'B' || c == 'L' || c == 'R' || c == 'S') {
      processCommand(c);
      rxBuffer = ""; // Limpiar cualquier residuo
    }
    // Si es inicio de comando de velocidad 'V' o parte del número
    else if (c == 'V' || c == 'v' || (c >= '0' && c <= '9')) {
      rxBuffer += c;
    }
    // Fin de línea para el comando de velocidad
    else if (c == '\n' || c == '\r') {
      if (rxBuffer.length() > 0) {
        processSpeedString(rxBuffer);
        rxBuffer = "";
      }
    }
    // Ignorar espacios en blanco
    else if (c == ' ' || c == '\t') {
      // noop
    }
    // Carácter desconocido recibido
    else {
      rxBuffer = "";
    }
  }

  // Pequeño rendimiento de CPU para el scheduler de FreeRTOS sin bloquear
  yield();
}
