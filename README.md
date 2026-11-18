# SmartCarESP32 - Control de Coche Robot con Expo, React Native y ESP32

Aplicación móvil profesional desarrollada con **Expo (SDK 58)**, **React Native**, **TypeScript** y **Bluetooth Classic (SPP)** para controlar remotamente un coche robot de dos motores DC accionado por un microcontrolador **ESP32-WROOM-32** y un driver de potencia **L298N**.

---

## 📋 Tabla de Contenidos
1. [Descripción General](#-descripción-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Componentes de Hardware y Conexiones](#-componentes-de-hardware-y-conexiones)
4. [Protocolo de Comunicación Bluetooth Classic](#-protocolo-de-comunicación-bluetooth-classic)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Sistema de Seguridad y Watchdog](#-sistema-de-seguridad-y-watchdog)
7. [Instalación y Configuración del Entorno Móvil](#-instalación-y-configuración-del-entorno-móvil)
8. [Generación del APK de Instalación](#-generación-del-apk-de-instalación)
9. [Firmware ESP32 (Arduino IDE)](#-firmware-esp32-arduino-ide)
10. [Guía de Uso de la Aplicación](#-guía-de-uso-de-la-aplicación)
11. [Solución de Problemas Frecuentes](#-solución-de-problemas-frecuentes)

---

## 🚀 Descripción General

**SmartCarESP32** es una solución integral diseñada para el control remoto de vehículos inteligentes. La aplicación móvil ofrece una interfaz intuitiva inspirada en consolas de radiocontrol, con soporte para:
- Comunicación serie sobre Bluetooth Classic (RFCOMM / SPP) mediante `react-native-bluetooth-classic`.
- Control bidireccional de dirección con botones táctiles mantenidos (`onPressIn` / `onPressOut`).
- Modulación de velocidad mediante señales PWM generadas por el ESP32 (0 - 255).
- Botón de parada de emergencia siempre accesible.
- Sistema de seguridad activo con temporizador watchdog de 700 ms y detención automática en segundo plano.
- Consola de telemetría y terminal en tiempo real para visualizar los comandos transmitidos (TX) y las respuestas recibidas (RX).

---

## 🏗 Arquitectura del Sistema

```
+-----------------------------------+
|         APLICACIÓN MÓVIL          |
|    Expo / React Native / TS       |
+-----------------------------------+
                 │
                 │ Bluetooth Classic (SPP / RFCOMM)
                 │ Canal serie bidireccional (V180\n, F, B, L, R, S)
                 ▼
+-----------------------------------+
|           ESP32-WROOM-32          |
|   Firmware C++ (BluetoothSerial)  |
|   Watchdog de Seguridad (700 ms)  |
+-----------------------------------+
      │                   │
      │ PWM (33, 32)      │ GPIO Dirección (25, 26, 27, 14)
      ▼                   ▼
+-----------------------------------+
|          DRIVER L298N             |
|        Puente H Dual DC           |
+-----------------------------------+
       │                     │
       ▼                     ▼
 Motor Izquierdo       Motor Derecho
 (Rueda Izquierda)     (Rueda Derecha)
```

---

## 🔌 Componentes de Hardware y Conexiones

### Lista de Materiales:
- **1x ESP32 DevKit V1** (Microcontrolador ESP32-WROOM-32 con antena integrada).
- **1x Driver de motores puente H L298N**.
- **2x Motores DC con reductora** (habitualmente amarillos tipo TT 3V-6V).
- **2x Ruedas de goma** + 1x rueda loca (caster wheel).
- **1x Portapilas / Batería externa** (ej. 2 baterías 18650 Li-ion en serie = 7.4V - 8.4V para los motores).
- **1x Fuente de alimentación USB o regulador 5V** para el ESP32.
- **Cables jumper** macho-hembra y macho-macho.

### Tabla de Pines ESP32 -> L298N:

| Componente | Pin L298N | Pin GPIO ESP32 | Función | Notas |
|---|---|---|---|---|
| **Motor Izquierdo** | **IN1** | **GPIO 25** | Dirección Avance | Salida digital |
| **Motor Izquierdo** | **IN2** | **GPIO 26** | Dirección Retroceso | Salida digital |
| **Motor Izquierdo** | **ENA** | **GPIO 33** | Modulación PWM (Velocidad) | ⚠️ **Retirar jumper ENA del L298N** |
| **Motor Derecho** | **IN3** | **GPIO 27** | Dirección Avance | Salida digital |
| **Motor Derecho** | **IN4** | **GPIO 14** | Dirección Retroceso | Salida digital |
| **Motor Derecho** | **ENB** | **GPIO 32** | Modulación PWM (Velocidad) | ⚠️ **Retirar jumper ENB del L298N** |
| **Tierra Común** | **GND** | **GND** | Masa Común de Referencia | **Obligatorio unir GND ESP32 y L298N** |

> [!IMPORTANT]
> **Retirar los Jumpers de ENA y ENB:** El módulo L298N viene de fábrica con dos jumpers negros que cortocircuitan ENA y ENB a 5V (fijando la velocidad al 100%). Para regular la velocidad mediante PWM desde el ESP32, es indispensable retirar ambos jumpers y conectar los pines ENA y ENB a los GPIO 33 y 32 del ESP32 respectivamente.

> [!WARNING]
> **Tierra Común (Common GND):** El pin GND del L298N debe estar físicamente conectado al pin GND del ESP32 y al borne negativo de la batería de tracción. Si no comparten la misma referencia de masa, los motores experimentarán pulsos aleatorios o no responderán.

---

## 📡 Protocolo de Comunicación Bluetooth Classic

El microcontrolador ESP32 publica el servicio de puerto serie bajo el nombre:
**`SmartCarESP32`**

### Comandos Enviados por la Aplicación Móvil (TX):

| Comando | Formato | Acción | Comportamiento en Motores |
|---|---|---|---|
| **F** | 1 carácter (`'F'`) | Avanzar hacia adelante | Izquierdo: IN1=HIGH, IN2=LOW <br> Derecho: IN3=HIGH, IN4=LOW |
| **B** | 1 carácter (`'B'`) | Retroceder | Izquierdo: IN1=LOW, IN2=HIGH <br> Derecho: IN3=LOW, IN4=HIGH |
| **L** | 1 carácter (`'L'`) | Girar a la izquierda (giro sobre eje) | Izquierdo: IN1=LOW, IN2=HIGH <br> Derecho: IN3=HIGH, IN4=LOW |
| **R** | 1 carácter (`'R'`) | Girar a la derecha (giro sobre eje) | Izquierdo: IN1=HIGH, IN2=LOW <br> Derecho: IN3=LOW, IN4=HIGH |
| **S** | 1 carácter (`'S'`) | Detener inmediatamente | Ambos motores en LOW, PWM en 0 |
| **V0 - V255** | Cadena con `\n` (ej. `V180\n`) | Configurar velocidad PWM | Ajusta ciclo de trabajo (duty cycle) de ENA y ENB |

### Respuestas Emitidas por el ESP32 (RX):

| Respuesta | Significado |
|---|---|
| `READY\n` | Enviado al establecerse la conexión Bluetooth con el cliente Android. |
| `OK:F\n` | Movimiento de avance confirmado. |
| `OK:B\n` | Movimiento de retroceso confirmado. |
| `OK:L\n` | Giro a la izquierda confirmado. |
| `OK:R\n` | Giro a la derecha confirmado. |
| `OK:S\n` | Parada de motores confirmada. |
| `OK:V180\n` | Velocidad ajustada con éxito al valor numérico especificado. |
| `ERR:UNKNOWN_<CMD>\n` | Comando no reconocido por el firmware. |

---

## 📂 Estructura del Proyecto

```
Expo_coche/
├── app/                                 # Rutas y Pantallas de Expo Router
│   ├── _layout.tsx                      # Layout raíz con configuración de tema y barra de estado
│   └── index.tsx                        # Pantalla principal del control remoto del vehículo
│
├── src/
│   ├── components/                      # Componentes visuales y de control
│   │   ├── ConnectionCard.tsx           # Gestión de enlace Bluetooth y selector de dispositivos
│   │   ├── DirectionPad.tsx             # Pad direccional (Adelante, Atrás, Izq, Der, Stop)
│   │   ├── SpeedControl.tsx             # Control deslizante (Slider) y presets de velocidad
│   │   ├── StatusCard.tsx               # Cuadro de telemetría y terminal serie SPP
│   │   └── StopButton.tsx               # Botón de parada de emergencia
│   │
│   ├── services/
│   │   └── BluetoothService.ts          # Capa nativa de comunicación Bluetooth Classic
│   │
│   ├── hooks/
│   │   └── useCarController.ts          # Hook con la lógica de control, heartbeat y seguridad
│   │
│   ├── constants/
│   │   ├── bluetooth.ts                 # Constantes de temporización, comandos y nombres
│   │   └── theme.ts                     # Paleta de colores minimalista y dimensiones
│   │
│   ├── types/
│   │   └── car.ts                       # Tipos TypeScript para estado, eventos y comandos
│   │
│   └── utils/
│       └── commandParser.ts             # Formateo y validación de comandos y respuestas
│
├── firmware/
│   └── SmartCarESP32.ino                # Código fuente C++ para ESP32 (Arduino IDE)
│
├── android/                             # Configuración nativa Android precompilada (EAS / Gradle)
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml # Permisos Bluetooth Connect, Scan y Location
│   │   └── build.gradle
│   ├── gradle.properties                # newArchEnabled=false para compatibilidad con BT Classic
│   └── local.properties
│
├── app.json                             # Metadatos del proyecto y paquete com.smartcar.esp32
├── eas.json                             # Perfiles de compilación para generar APK con EAS
├── package.json                         # Dependencias del proyecto
└── tsconfig.json                        # Configuración estricta de TypeScript
```

---

## 🛡️ Sistema de Seguridad y Watchdog

Para evitar que el robot continúe en movimiento en situaciones anómalas (caída de señal, desconexión accidental, cierre de app), se implementaron múltiples capas de seguridad:

1. **Watchdog de Comunicación en ESP32 (700 ms):**
   - El firmware supervisa el tiempo transcurrido desde el último comando de movimiento recibido.
   - Si no se recibe ningún comando durante 700 ms, el ESP32 **apaga inmediatamente ambos motores**.
2. **Latido Periódico en la App (Heartbeat 200 ms):**
   - Mientras el usuario mantenga presionado un botón en el Pad Direccional (`onPressIn`), la aplicación emite el comando correspondiente cada 200 ms.
   - Al soltar el dedo (`onPressOut`), el temporizador se cancela y se transmite instantáneamente `'S'`.
3. **Parada Inicial al Conectar:**
   - En el instante en que el socket RFCOMM se abre, la aplicación y el firmware ejecutan de forma obligatoria el comando `'S'`.
4. **Protección en Segundo Plano:**
   - Si la aplicación pasa a segundo plano o se bloquea la pantalla, el listener de `AppState` emite `'S'` y desactiva el lazo de transmisión.
5. **Detección de Desconexión de Hardware:**
   - El evento `ESP_SPP_CLOSE_EVT` en el ESP32 frena los motores en el microcontrolador de forma autónoma.

---

## 💻 Instalación y Configuración del Entorno Móvil

### Requisitos Previos:
- **Node.js**: v18 o superior (probado en Node v22.14).
- **npm** o **bun**.
- Dispositivo móvil Android (Android 8.0 a Android 15).

### 1. Clonar el repositorio e instalar dependencias:
```bash
git clone <URL_DEL_REPOSITORIO>
cd Expo_coche
npm install
```

### 2. Comprobar la salud del proyecto:
```bash
npx tsc --noEmit     # Comprobación de tipos TypeScript
npx expo-doctor      # Diagnóstico completo de configuración Expo
```

---

## 📦 Generación del APK de Instalación

Dado que **Bluetooth Classic** requiere librerías nativas de Android (`react-native-bluetooth-classic`), la app no debe ejecutarse en el cliente genérico de Expo Go, sino mediante un **APK instalable** o una **Expo Development Build**.

Existen dos métodos para compilar el APK:

### Método A: Compilación en la Nube con EAS Build (Recomendado - Sin configurar Android Studio)
Expo Application Services (EAS) permite compilar el APK en los servidores en la nube de Expo de forma gratuita:

1. **Instalar EAS CLI globalmente (o usar `npx eas-cli`):**
   ```bash
   npm install -g eas-cli
   ```

2. **Iniciar sesión en Expo:**
   ```bash
   eas login
   ```

3. **Compilar el APK para Android:**
   ```bash
   eas build -p android --profile preview
   ```
   *El archivo `eas.json` incluido en este repositorio ya contiene la configuración `"buildType": "apk"` en el perfil `preview`.*

4. **Instalación:** Al finalizar el proceso en la nube (5-8 minutos), EAS entregará un enlace directo de descarga y un código QR para instalar el archivo `.apk` directamente en tu teléfono Android.

---

### Método B: Compilación Local con Android Studio / Gradle

Si prefieres compilar localmente en tu ordenador:

1. **Instalar Java Development Kit (JDK 17):**
   - Descarga e instala **Eclipse Temurin JDK 17** o **Microsoft OpenJDK 17**.
   - Configura la variable de entorno del sistema `JAVA_HOME` apuntando al directorio de instalación (por ejemplo, `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`).
   - Añade `%JAVA_HOME%\bin` a tu variable `PATH`.

2. **Verificar Android SDK:**
   - Asegúrate de tener Android SDK Platform 34 o 35 instalado (en `AppData\Local\Android\Sdk`).

3. **Compilar el APK Release o Debug:**
   ```bash
   cd android
   .\gradlew assembleRelease
   ```
   *El archivo APK compilado se generará en:*  
   `android/app/build/outputs/apk/release/app-release.apk`

---

## ⚙️ Firmware ESP32 (Arduino IDE)

### 1. Configuración de Arduino IDE:
1. Instala el soporte de placas ESP32 en Arduino IDE:
   - Ve a **Archivo > Preferencias**.
   - En *Gestor de URLs Adicionales de Tarjetas*, añade:  
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Ve a **Herramientas > Placa > Gestor de Tarjetas**, busca **esp32** de Espressif Systems e instálalo.
2. Selecciona tu placa en **Herramientas > Placa > ESP32 Arduino > ESP32 Dev Module**.
3. Selecciona el puerto COM correspondiente a tu placa en **Herramientas > Puerto**.

### 2. Cargar el Firmware:
1. Abre el archivo `firmware/SmartCarESP32.ino` en Arduino IDE.
2. Haz clic en **Subir (Upload)**.
3. Abre el **Monitor Serie** a `115200 baudios` para verificar que el módulo Bluetooth inicie correctamente:
   ```
   =========================================
     INICIALIZANDO SMART CAR ESP32...
   =========================================
   [BT] Dispositivo "SmartCarESP32" iniciado y visible para emparejar.
   [SISTEMA] Listo para recibir conexiones.
   ```

---

## 📱 Guía de Uso de la Aplicación

1. **Emparejamiento Inicial:**
   - Enciende el ESP32.
   - En tu teléfono Android, abre **Ajustes > Bluetooth**.
   - Busca dispositivos disponibles y selecciona **SmartCarESP32**.
   - Confirma el emparejamiento (código PIN predeterminado no requerido o `1234`).
2. **Abrir la Aplicación Smart Car:**
   - Abre la aplicación en tu celular.
   - En la tarjeta **ESTADO BLUETOOTH**, pulsa **Elegir** o verifica que `SmartCarESP32` esté seleccionado.
   - Pulsa el botón **CONECTAR**.
   - El indicador cambiará a color verde **ONLINE** y se emitirá el pitido de inicialización segura.
3. **Control de Movimiento:**
   - Mantén presionado **ADELANTE** para avanzar.
   - Mantén presionado **ATRÁS** para retroceder.
   - Mantén presionado **IZQ** o **DER** para girar.
   - En cuanto retires el dedo de la pantalla, el coche se detendrá al instante.
4. **Regulación de Velocidad:**
   - Desplaza el control deslizante para ajustar la potencia de los motores entre 0 y 255.
   - O presiona los botones rápidos de **25%**, **50%**, **75%** o **MAX**.
5. **Parada de Emergencia:**
   - Si necesitas detener el vehículo ante cualquier obstáculo imprevisto, pulsa el botón rojo central **STOP** o el banner inferior **PARADA DE EMERGENCIA**.

---

## 🔧 Solución de Problemas Frecuentes

| Síntoma / Error | Causa Probable | Solución |
|---|---|---|
| **La app no encuentra el ESP32 en la lista de dispositivos.** | El ESP32 no está previamente emparejado en Android. | Ve a los Ajustes de Bluetooth del teléfono y empareja `SmartCarESP32` antes de conectar en la app. |
| **Los motores hacen un pitido agudo pero no giran.** | La velocidad PWM configurada es muy baja para vencer la inercia, o la batería de tracción está descargada. | Aumenta la velocidad con el Slider (por encima de 150) o recarga la batería de los motores. |
| **Uno de los motores gira al revés al avanzar.** | Polaridad de cables invertida en el borne del L298N. | Intercambia entre sí los dos cables del motor en las salidas `OUT1`/`OUT2` o `OUT3`/`OUT4` del L298N. |
| **El ESP32 se reinicia al intentar arrancar los motores.** | Caída de voltaje provocada por alimentar los motores desde el pin de 5V del ESP32. | Alimenta el L298N con una batería externa independiente (6V - 9V) y comparte únicamente el pin GND con el ESP32. |
| **Error de permisos al pulsar Conectar.** | Permisos de Bluetooth Connect o Scan denegados en Android 12+. | Abre Información de la Aplicación en Android y concede los permisos de "Dispositivos cercanos". |
| **Los motores funcionan al 100% sin importar el Slider.** | Los jumpers de ENA / ENB siguen puestos en el L298N. | Retira los dos jumpers negros de los pines ENA y ENB del módulo L298N. |

---

## 📄 Licencia
Este proyecto está distribuido bajo la licencia MIT. Diseñado para fines educativos, de robótica y prototipado IoT con microcontroladores ESP32 y tecnologías móviles modernas.
