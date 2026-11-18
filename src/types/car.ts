export type CarMovement = 'F' | 'B' | 'L' | 'R' | 'S';

export type CarState =
  | 'idle'
  | 'forward'
  | 'backward'
  | 'turning_left'
  | 'turning_right'
  | 'emergency_stop'
  | 'error';

export type BluetoothConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface BluetoothDeviceItem {
  name: string;
  address: string;
  bonded?: boolean;
  id?: string;
  type?: string;
}

export interface BluetoothLogMessage {
  id: string;
  timestamp: string;
  direction: 'tx' | 'rx' | 'system' | 'error';
  message: string;
}

export interface CarStatusInfo {
  connectionStatus: BluetoothConnectionStatus;
  connectedDevice: BluetoothDeviceItem | null;
  carState: CarState;
  lastCommand: string;
  speed: number;
  lastResponse: string;
  rxBuffer: string;
}
