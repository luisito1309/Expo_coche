import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { BluetoothConnectionStatus, BluetoothDeviceItem } from '../types/car';
import { BLUETOOTH_CONSTANTS } from '../constants/bluetooth';

interface ConnectionCardProps {
  connectionStatus: BluetoothConnectionStatus;
  connectedDevice: BluetoothDeviceItem | null;
  pairedDevices: BluetoothDeviceItem[];
  onConnect: (device: BluetoothDeviceItem) => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connectionStatus,
  connectedDevice,
  pairedDevices,
  onConnect,
  onDisconnect,
  onRefresh,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDeviceItem | null>(null);

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnecting = connectionStatus === 'disconnecting';

  // Find preferred device or first device
  const defaultDevice =
    selectedDevice ||
    pairedDevices.find(
      (d) => d.name?.toLowerCase() === BLUETOOTH_CONSTANTS.TARGET_DEVICE_NAME.toLowerCase()
    ) ||
    pairedDevices[0] ||
    null;

  const handleSelectDevice = (device: BluetoothDeviceItem) => {
    setSelectedDevice(device);
    setModalVisible(false);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return COLORS.success;
      case 'connecting':
      case 'disconnecting':
        return COLORS.warning;
      case 'error':
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'CONECTADO';
      case 'connecting':
        return 'CONECTANDO...';
      case 'disconnecting':
        return 'DESCONECTANDO...';
      case 'error':
        return 'ERROR DE CONEXIÓN';
      default:
        return 'DESCONECTADO';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="bluetooth" size={20} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>ESTADO BLUETOOTH</Text>
        </View>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      {/* Device Selection Row */}
      <View style={styles.deviceSelectBox}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceLabel}>Dispositivo destino:</Text>
          <Text style={styles.deviceName} numberOfLines={1}>
            {connectedDevice?.name || defaultDevice?.name || 'Ningún dispositivo seleccionado'}
          </Text>
          <Text style={styles.deviceAddress}>
            {connectedDevice?.address || defaultDevice?.address || 'Empareje el ESP32 en Android'}
          </Text>
        </View>

        {!isConnected && (
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setModalVisible(true)}
            disabled={isConnecting}
          >
            <Ionicons name="list" size={16} color={COLORS.primaryLight} />
            <Text style={styles.changeButtonText}>Elegir</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isConnecting || isDisconnecting}
        >
          <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {isConnected ? (
          <TouchableOpacity
            style={[styles.mainButton, styles.disconnectButton]}
            onPress={onDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <>
                <Ionicons name="power" size={18} color={COLORS.text} />
                <Text style={styles.mainButtonText}>DESCONECTAR</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.mainButton,
              styles.connectButton,
              (!defaultDevice || isConnecting) && styles.disabledButton,
            ]}
            onPress={() => defaultDevice && onConnect(defaultDevice)}
            disabled={!defaultDevice || isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <>
                <Ionicons name="bluetooth-outline" size={18} color={COLORS.text} />
                <Text style={styles.mainButtonText}>CONECTAR</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Modal to pick paired device */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispositivos Emparejados</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {pairedDevices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>
                  No se encontraron dispositivos emparejados.
                </Text>
                <Text style={styles.emptySubtext}>
                  Empareja el dispositivo "SmartCarESP32" desde los Ajustes de Bluetooth de tu teléfono.
                </Text>
              </View>
            ) : (
              <FlatList
                data={pairedDevices}
                keyExtractor={(item) => item.address}
                renderItem={({ item }) => {
                  const isSmartCar =
                    item.name?.toLowerCase() ===
                    BLUETOOTH_CONSTANTS.TARGET_DEVICE_NAME.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.deviceItem,
                        isSmartCar && styles.deviceItemHighlight,
                      ]}
                      onPress={() => handleSelectDevice(item)}
                    >
                      <View style={styles.deviceIconWrapper}>
                        <Ionicons
                          name={isSmartCar ? 'car-sport' : 'hardware-chip-outline'}
                          size={22}
                          color={isSmartCar ? COLORS.accent : COLORS.textSecondary}
                        />
                      </View>
                      <View style={styles.deviceItemDetails}>
                        <Text style={[styles.deviceItemName, isSmartCar && styles.textHighlight]}>
                          {item.name}
                        </Text>
                        <Text style={styles.deviceItemAddress}>{item.address}</Text>
                      </View>
                      {isSmartCar && (
                        <View style={styles.targetBadge}>
                          <Text style={styles.targetBadgeText}>RECOMENDADO</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deviceSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0E1726',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  deviceName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  deviceAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  changeButtonText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#1E293B',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  connectButton: {
    backgroundColor: COLORS.primary,
  },
  disconnectButton: {
    backgroundColor: '#334155',
  },
  disabledButton: {
    opacity: 0.5,
  },
  mainButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#0E1726',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deviceItemHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: '#132342',
  },
  deviceIconWrapper: {
    marginRight: SPACING.md,
  },
  deviceItemDetails: {
    flex: 1,
  },
  deviceItemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  textHighlight: {
    color: COLORS.accent,
  },
  deviceItemAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  targetBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  targetBadgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
  },
});
