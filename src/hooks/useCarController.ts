import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { BLUETOOTH_CONSTANTS } from '../constants/bluetooth';
import {
  CarMovement,
  CarState,
  BluetoothConnectionStatus,
  BluetoothDeviceItem,
  BluetoothLogMessage,
} from '../types/car';
import bluetoothService from '../services/BluetoothService';
import {
  formatMovementCommand,
  formatSpeedCommand,
  movementToCarState,
  parseESP32Response,
} from '../utils/commandParser';

export function useCarController() {
  const [connectionStatus, setConnectionStatus] =
    useState<BluetoothConnectionStatus>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDeviceItem | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDeviceItem[]>([]);
  const [carState, setCarState] = useState<CarState>('idle');
  const [currentCommand, setCurrentCommand] = useState<CarMovement>('S');
  const [speed, setSpeedState] = useState<number>(BLUETOOTH_CONSTANTS.DEFAULT_SPEED);
  const [lastResponse, setLastResponse] = useState<string>('Esperando conexión...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<BluetoothLogMessage[]>([]);

  // Refs for tracking mutable state without re-triggering callbacks
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMovementRef = useRef<CarMovement>('S');
  const isConnectedRef = useRef<boolean>(false);
  const speedRef = useRef<number>(BLUETOOTH_CONSTANTS.DEFAULT_SPEED);

  // Helper to append log messages (max 50)
  const addLog = useCallback(
    (direction: 'tx' | 'rx' | 'system' | 'error', message: string) => {
      const entry: BluetoothLogMessage = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        direction,
        message,
      };
      setLogs((prev) => [entry, ...prev.slice(0, 49)]);
    },
    []
  );

  // Clear any active movement heartbeat interval
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Send raw string over Bluetooth
  const transmit = useCallback(
    async (cmd: string): Promise<boolean> => {
      if (!isConnectedRef.current) {
        return false;
      }
      try {
        await bluetoothService.sendCommand(cmd);
        addLog('tx', cmd.trim());
        return true;
      } catch (err: any) {
        addLog('error', `TX Error: ${err?.message || err}`);
        return false;
      }
    },
    [addLog]
  );

  // Handle incoming data from ESP32
  const handleDataReceived = useCallback(
    (data: string) => {
      addLog('rx', data.trim());
      setLastResponse(data.trim());

      const parsed = parseESP32Response(data);
      if (parsed.type === 'ready') {
        addLog('system', 'ESP32 Listo para recibir comandos');
      } else if (parsed.type === 'ack') {
        // Confirmation received
      } else if (parsed.type === 'speed_ack') {
        if (parsed.speed !== undefined) {
          setSpeedState(parsed.speed);
          speedRef.current = parsed.speed;
        }
      } else if (parsed.type === 'error') {
        addLog('error', `ESP32 Error: ${parsed.command || parsed.raw}`);
      }
    },
    [addLog]
  );

  // Handle unexpected disconnects
  const handleDeviceDisconnected = useCallback(
    (address: string) => {
      clearHeartbeat();
      isConnectedRef.current = false;
      currentMovementRef.current = 'S';
      setConnectedDevice(null);
      setConnectionStatus('disconnected');
      setCarState('idle');
      setCurrentCommand('S');
      addLog('system', `Dispositivo ${address} desconectado.`);
      setErrorMessage('La conexión Bluetooth con el vehículo se ha cerrado.');
    },
    [addLog, clearHeartbeat]
  );

  // Refresh paired devices list
  const refreshPairedDevices = useCallback(async () => {
    try {
      setErrorMessage(null);
      const devices = await bluetoothService.getPairedDevices();
      setPairedDevices(devices);
      addLog('system', `${devices.length} dispositivos emparejados detectados.`);
      return devices;
    } catch (err: any) {
      const msg = err?.message || 'Error al obtener dispositivos emparejados';
      setErrorMessage(msg);
      addLog('error', msg);
      return [];
    }
  }, [addLog]);

  // Connect to a device
  const connectDevice = useCallback(
    async (deviceOrAddress: BluetoothDeviceItem | string) => {
      const address =
        typeof deviceOrAddress === 'string' ? deviceOrAddress : deviceOrAddress.address;

      try {
        clearHeartbeat();
        setConnectionStatus('connecting');
        setErrorMessage(null);
        addLog('system', `Iniciando conexión con ${address}...`);

        const device = await bluetoothService.connect(
          address,
          handleDataReceived,
          handleDeviceDisconnected
        );

        isConnectedRef.current = true;
        setConnectedDevice(device);
        setConnectionStatus('connected');
        addLog('system', `Conectado a ${device.name} (${device.address})`);

        // Safety Requirement: Send STOP command immediately upon connection
        await bluetoothService.sendCommand(BLUETOOTH_CONSTANTS.COMMAND_STOP);
        addLog('tx', 'S (Inicialización de seguridad)');
        setCarState('idle');
        setCurrentCommand('S');
        currentMovementRef.current = 'S';

        // Synchronize initial speed
        const speedCmd = formatSpeedCommand(speedRef.current);
        await bluetoothService.sendCommand(speedCmd);
        addLog('tx', speedCmd.trim());
      } catch (err: any) {
        isConnectedRef.current = false;
        setConnectedDevice(null);
        setConnectionStatus('error');
        const msg = err?.message || 'Error al conectar con el dispositivo';
        setErrorMessage(msg);
        addLog('error', msg);
      }
    },
    [addLog, clearHeartbeat, handleDataReceived, handleDeviceDisconnected]
  );

  // Disconnect from active device
  const disconnectDevice = useCallback(async () => {
    try {
      clearHeartbeat();
      setConnectionStatus('disconnecting');

      // Safety: Send STOP before closing
      if (isConnectedRef.current) {
        try {
          await bluetoothService.sendCommand(BLUETOOTH_CONSTANTS.COMMAND_STOP);
        } catch (_) {}
      }

      await bluetoothService.disconnect();
    } catch (err: any) {
      console.warn('Disconnect error:', err);
    } finally {
      isConnectedRef.current = false;
      currentMovementRef.current = 'S';
      setConnectedDevice(null);
      setConnectionStatus('disconnected');
      setCarState('idle');
      setCurrentCommand('S');
      addLog('system', 'Desconectado del vehículo.');
    }
  }, [addLog, clearHeartbeat]);

  // Press IN handler for movement buttons
  const handlePressIn = useCallback(
    async (cmd: CarMovement) => {
      if (!isConnectedRef.current || connectionStatus !== 'connected') {
        return;
      }

      // If conflicting movement, clear it first
      clearHeartbeat();

      currentMovementRef.current = cmd;
      setCurrentCommand(cmd);
      setCarState(movementToCarState(cmd));

      const formatted = formatMovementCommand(cmd);

      // 1. Send immediately on touch
      await transmit(formatted);

      // 2. Start heartbeat repeat every 200ms to keep ESP32 watchdog alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (isConnectedRef.current && currentMovementRef.current === cmd) {
          transmit(formatted);
        } else {
          clearHeartbeat();
        }
      }, BLUETOOTH_CONSTANTS.HEARTBEAT_INTERVAL_MS);
    },
    [clearHeartbeat, connectionStatus, transmit]
  );

  // Press OUT handler (user released the button)
  const handlePressOut = useCallback(async () => {
    clearHeartbeat();

    if (!isConnectedRef.current) {
      setCarState('idle');
      setCurrentCommand('S');
      currentMovementRef.current = 'S';
      return;
    }

    currentMovementRef.current = 'S';
    setCurrentCommand('S');
    setCarState('idle');

    // Send S immediately
    await transmit(BLUETOOTH_CONSTANTS.COMMAND_STOP);
  }, [clearHeartbeat, transmit]);

  // Emergency STOP button
  const handleEmergencyStop = useCallback(async () => {
    clearHeartbeat();
    currentMovementRef.current = 'S';
    setCurrentCommand('S');
    setCarState('emergency_stop');

    if (isConnectedRef.current) {
      await transmit(BLUETOOTH_CONSTANTS.COMMAND_STOP);
      addLog('system', 'PARADA DE EMERGENCIA ACTIVADA');
    }

    setTimeout(() => {
      setCarState('idle');
    }, 1500);
  }, [addLog, clearHeartbeat, transmit]);

  // Change Speed
  const handleSpeedChange = useCallback(
    async (newSpeed: number) => {
      const clamped = Math.max(
        BLUETOOTH_CONSTANTS.MIN_SPEED,
        Math.min(BLUETOOTH_CONSTANTS.MAX_SPEED, Math.round(newSpeed))
      );
      setSpeedState(clamped);
      speedRef.current = clamped;

      if (isConnectedRef.current) {
        const cmd = formatSpeedCommand(clamped);
        await transmit(cmd);
      }
    },
    [transmit]
  );

  // Safety: Stop car if app goes to background or becomes inactive
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState.match(/inactive|background/)) {
          clearHeartbeat();
          if (isConnectedRef.current) {
            try {
              await bluetoothService.sendCommand(BLUETOOTH_CONSTANTS.COMMAND_STOP);
              addLog('system', 'App en segundo plano: Motores detenidos por seguridad.');
            } catch (_) {}
            setCarState('idle');
            setCurrentCommand('S');
            currentMovementRef.current = 'S';
          }
        }
      }
    );

    return () => {
      subscription.remove();
      clearHeartbeat();
    };
  }, [addLog, clearHeartbeat]);

  // Auto-fetch paired devices on mount
  useEffect(() => {
    refreshPairedDevices();
    return () => {
      clearHeartbeat();
    };
  }, [clearHeartbeat, refreshPairedDevices]);

  return {
    connectionStatus,
    connectedDevice,
    pairedDevices,
    carState,
    currentCommand,
    speed,
    lastResponse,
    errorMessage,
    logs,
    refreshPairedDevices,
    connectDevice,
    disconnectDevice,
    handlePressIn,
    handlePressOut,
    handleEmergencyStop,
    handleSpeedChange,
  };
}
