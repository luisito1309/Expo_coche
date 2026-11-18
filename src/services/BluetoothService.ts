import { Platform, PermissionsAndroid } from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';
import { BLUETOOTH_CONSTANTS } from '../constants/bluetooth';
import { BluetoothDeviceItem } from '../types/car';

export type DataReceivedCallback = (data: string) => void;
export type DisconnectCallback = (address: string) => void;

class BluetoothService {
  private activeDevice: BluetoothDevice | null = null;
  private dataSubscription: BluetoothEventSubscription | null = null;
  private disconnectSubscription: BluetoothEventSubscription | null = null;
  private onDataCallback: DataReceivedCallback | null = null;
  private onDisconnectCallback: DisconnectCallback | null = null;

  /**
   * Check if the native Bluetooth Classic module is available in the current runtime.
   */
  public isModuleAvailable(): boolean {
    return Boolean(
      RNBluetoothClassic &&
      typeof RNBluetoothClassic.getBondedDevices === 'function'
    );
  }

  /**
   * Request all necessary Bluetooth permissions according to Android version.
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const apiLevel = Platform.Version;

      if (typeof apiLevel === 'number' && apiLevel >= 31) {
        // Android 12+ (API 31+)
        const permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

        const connectGranted =
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED;

        return connectGranted;
      } else {
        // Android 11 and lower
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación para Bluetooth',
            message:
              'Android requiere permisos de ubicación para buscar y conectar dispositivos Bluetooth.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );

        return (
          granted === PermissionsAndroid.RESULTS.GRANTED ||
          granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        );
      }
    } catch (error) {
      console.error('[BluetoothService] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Verify whether Bluetooth is enabled on the device.
   */
  public async isEnabled(): Promise<boolean> {
    if (!this.isModuleAvailable()) {
      return false;
    }
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch (error) {
      console.warn('[BluetoothService] Error checking if enabled:', error);
      return false;
    }
  }

  /**
   * Prompt user to enable Bluetooth.
   */
  public async requestEnable(): Promise<boolean> {
    if (!this.isModuleAvailable()) {
      return false;
    }
    try {
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch (error) {
      console.warn('[BluetoothService] Error requesting Bluetooth enable:', error);
      return false;
    }
  }

  /**
   * Get list of paired / bonded Bluetooth devices.
   */
  public async getPairedDevices(): Promise<BluetoothDeviceItem[]> {
    if (!this.isModuleAvailable()) {
      throw new Error(
        'El módulo nativo react-native-bluetooth-classic no está disponible. Asegúrate de ejecutar una compilación de desarrollo (Expo Dev Build / APK).'
      );
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Permisos Bluetooth denegados por el usuario.');
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      const turnedOn = await this.requestEnable();
      if (!turnedOn) {
        throw new Error('Bluetooth no está activado en el dispositivo.');
      }
    }

    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map((d: BluetoothDevice) => ({
        name: d.name || 'Dispositivo desconocido',
        address: d.address,
        bonded: Boolean(d.bonded),
        id: d.id,
      }));
    } catch (error: any) {
      console.error('[BluetoothService] Error fetching bonded devices:', error);
      throw new Error(`Error al consultar dispositivos emparejados: ${error?.message || error}`);
    }
  }

  /**
   * Find the default SmartCarESP32 device among bonded devices.
   */
  public async findSmartCarDevice(): Promise<BluetoothDeviceItem | null> {
    const devices = await this.getPairedDevices();
    return (
      devices.find(
        (d) =>
          d.name?.toLowerCase() === BLUETOOTH_CONSTANTS.TARGET_DEVICE_NAME.toLowerCase()
      ) || null
    );
  }

  /**
   * Connect to a specific Bluetooth device by address.
   */
  public async connect(
    address: string,
    onData?: DataReceivedCallback,
    onDisconnect?: DisconnectCallback
  ): Promise<BluetoothDeviceItem> {
    if (!this.isModuleAvailable()) {
      throw new Error(
        'El módulo nativo react-native-bluetooth-classic no está disponible en este entorno.'
      );
    }

    // Clean up any previous connection
    await this.disconnect();

    this.onDataCallback = onData || null;
    this.onDisconnectCallback = onDisconnect || null;

    try {
      console.log(`[BluetoothService] Connecting to ${address}...`);

      const device = await RNBluetoothClassic.connectToDevice(address, {
        delimiter: BLUETOOTH_CONSTANTS.DELIMITER,
        charset: 'utf-8',
      });

      this.activeDevice = device;

      // Register disconnect listener
      this.disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected((event) => {
        if (event.device.address === address) {
          console.warn(`[BluetoothService] Device ${address} disconnected`);
          this.cleanupSubscriptions();
          this.activeDevice = null;
          if (this.onDisconnectCallback) {
            this.onDisconnectCallback(address);
          }
        }
      });

      // Register data listener on device
      this.dataSubscription = device.onDataReceived((event) => {
        if (event.data && this.onDataCallback) {
          this.onDataCallback(event.data);
        }
      });

      return {
        name: device.name || 'SmartCarESP32',
        address: device.address,
        bonded: Boolean(device.bonded),
        id: device.id,
      };
    } catch (error: any) {
      this.cleanupSubscriptions();
      this.activeDevice = null;
      console.error(`[BluetoothService] Connection failed to ${address}:`, error);
      throw new Error(`Fallo al conectar con ${address}: ${error?.message || error}`);
    }
  }

  /**
   * Disconnect from the currently active device.
   */
  public async disconnect(): Promise<void> {
    this.cleanupSubscriptions();

    if (this.activeDevice) {
      try {
        const isConn = await this.activeDevice.isConnected();
        if (isConn) {
          // Send STOP command before closing socket for safety
          try {
            await this.activeDevice.write(BLUETOOTH_CONSTANTS.COMMAND_STOP, 'utf-8');
          } catch (_) {
            // Ignore error if socket is already shutting down
          }
          await this.activeDevice.disconnect();
        }
      } catch (err) {
        console.warn('[BluetoothService] Disconnect error (ignored):', err);
      } finally {
        this.activeDevice = null;
      }
    }
  }

  /**
   * Check if currently connected.
   */
  public async isConnected(): Promise<boolean> {
    if (!this.activeDevice) {
      return false;
    }
    try {
      return await this.activeDevice.isConnected();
    } catch {
      return false;
    }
  }

  /**
   * Send a raw string command over Bluetooth Classic SPP.
   */
  public async sendCommand(command: string): Promise<boolean> {
    if (!this.activeDevice) {
      throw new Error('No hay un dispositivo Bluetooth conectado.');
    }

    try {
      const isConn = await this.activeDevice.isConnected();
      if (!isConn) {
        throw new Error('La conexión Bluetooth se ha perdido.');
      }

      await this.activeDevice.write(command, 'utf-8');
      return true;
    } catch (error: any) {
      console.error(`[BluetoothService] Failed to send command "${command}":`, error);
      throw error;
    }
  }

  /**
   * Clean up event listeners.
   */
  private cleanupSubscriptions(): void {
    if (this.dataSubscription) {
      try {
        this.dataSubscription.remove();
      } catch (_) {}
      this.dataSubscription = null;
    }

    if (this.disconnectSubscription) {
      try {
        this.disconnectSubscription.remove();
      } catch (_) {}
      this.disconnectSubscription = null;
    }
  }
}

export const bluetoothService = new BluetoothService();
export default bluetoothService;
