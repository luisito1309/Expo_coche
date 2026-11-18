import { BLUETOOTH_CONSTANTS } from '../constants/bluetooth';
import { CarMovement, CarState } from '../types/car';

export interface ParsedResponse {
  type: 'ready' | 'ack' | 'speed_ack' | 'error' | 'unknown';
  command?: string;
  speed?: number;
  raw: string;
}

export function formatMovementCommand(movement: CarMovement): string {
  return movement;
}

export function formatSpeedCommand(speed: number): string {
  const clamped = Math.max(
    BLUETOOTH_CONSTANTS.MIN_SPEED,
    Math.min(BLUETOOTH_CONSTANTS.MAX_SPEED, Math.round(speed))
  );
  return `V${clamped}\n`;
}

export function movementToCarState(movement: CarMovement): CarState {
  switch (movement) {
    case 'F':
      return 'forward';
    case 'B':
      return 'backward';
    case 'L':
      return 'turning_left';
    case 'R':
      return 'turning_right';
    case 'S':
      return 'idle';
    default:
      return 'idle';
  }
}

export function carStateToLabel(state: CarState): string {
  switch (state) {
    case 'forward':
      return 'AVANZANDO';
    case 'backward':
      return 'RETROCEDIENDO';
    case 'turning_left':
      return 'GIRANDO IZQUIERDA';
    case 'turning_right':
      return 'GIRANDO DERECHA';
    case 'emergency_stop':
      return 'PARADA DE EMERGENCIA';
    case 'idle':
      return 'DETENIDO';
    case 'error':
      return 'ERROR';
    default:
      return 'DESCONOCIDO';
  }
}

export function speedToPercentage(speed: number): number {
  const clamped = Math.max(
    BLUETOOTH_CONSTANTS.MIN_SPEED,
    Math.min(BLUETOOTH_CONSTANTS.MAX_SPEED, speed)
  );
  return Math.round((clamped / BLUETOOTH_CONSTANTS.MAX_SPEED) * 100);
}

export function parseESP32Response(raw: string): ParsedResponse {
  const trimmed = raw.trim();

  if (trimmed === 'READY') {
    return { type: 'ready', raw: trimmed };
  }

  if (trimmed.startsWith('OK:')) {
    const payload = trimmed.substring(3);
    if (payload.startsWith('V')) {
      const spd = parseInt(payload.substring(1), 10);
      return {
        type: 'speed_ack',
        command: payload,
        speed: isNaN(spd) ? undefined : spd,
        raw: trimmed,
      };
    }
    return {
      type: 'ack',
      command: payload,
      raw: trimmed,
    };
  }

  if (trimmed.startsWith('ERR:')) {
    return {
      type: 'error',
      command: trimmed.substring(4),
      raw: trimmed,
    };
  }

  return {
    type: 'unknown',
    raw: trimmed,
  };
}
