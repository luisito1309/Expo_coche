export const BLUETOOTH_CONSTANTS = {
  TARGET_DEVICE_NAME: 'SmartCarESP32',
  
  // Single-character movement commands
  COMMAND_FORWARD: 'F' as const,
  COMMAND_BACKWARD: 'B' as const,
  COMMAND_LEFT: 'L' as const,
  COMMAND_RIGHT: 'R' as const,
  COMMAND_STOP: 'S' as const,

  // Timing configuration
  HEARTBEAT_INTERVAL_MS: 200,    // Periodic repeat while button is pressed
  WATCHDOG_TIMEOUT_MS: 700,      // ESP32 watchdog timeout (firmware reference)
  CONNECT_TIMEOUT_MS: 10000,     // Bluetooth connection attempt timeout
  
  // Speed bounds
  DEFAULT_SPEED: 180,
  MIN_SPEED: 0,
  MAX_SPEED: 255,

  // Delimiter for responses and speed commands
  DELIMITER: '\n',

  // Expected ESP32 Responses
  RESP_READY: 'READY',
  RESP_OK_F: 'OK:F',
  RESP_OK_B: 'OK:B',
  RESP_OK_L: 'OK:L',
  RESP_OK_R: 'OK:R',
  RESP_OK_S: 'OK:S',
};
