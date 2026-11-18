import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { BluetoothConnectionStatus, BluetoothDeviceItem, BluetoothLogMessage, CarState } from '../types/car';
import { carStateToLabel } from '../utils/commandParser';

interface StatusCardProps {
  connectionStatus: BluetoothConnectionStatus;
  connectedDevice: BluetoothDeviceItem | null;
  carState: CarState;
  lastCommand: string;
  speed: number;
  lastResponse: string;
  logs: BluetoothLogMessage[];
}

export const StatusCard: React.FC<StatusCardProps> = ({
  connectionStatus,
  connectedDevice,
  carState,
  lastCommand,
  speed,
  lastResponse,
  logs,
}) => {
  const [showLogs, setShowLogs] = useState(false);

  const getCarStateColor = () => {
    switch (carState) {
      case 'forward':
      case 'backward':
      case 'turning_left':
      case 'turning_right':
        return COLORS.accent;
      case 'emergency_stop':
      case 'error':
        return COLORS.danger;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="stats-chart" size={18} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>TELEMETRÍA Y ESTADO</Text>
        </View>

        <TouchableOpacity
          style={styles.toggleLogButton}
          onPress={() => setShowLogs(!showLogs)}
        >
          <Ionicons
            name={showLogs ? 'chevron-up' : 'terminal-outline'}
            size={14}
            color={COLORS.primaryLight}
          />
          <Text style={styles.toggleLogText}>
            {showLogs ? 'Ocultar Terminal' : 'Ver Terminal'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid of status metrics */}
      <View style={styles.grid}>
        {/* Metric 1: Car State */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ESTADO ROBOT</Text>
          <Text
            style={[styles.metricValue, { color: getCarStateColor() }]}
            numberOfLines={1}
          >
            {carStateToLabel(carState)}
          </Text>
        </View>

        {/* Metric 2: Last Command */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ÚLTIMO COMANDO</Text>
          <Text style={[styles.metricValue, styles.monoValue]}>
            {lastCommand || 'NINGUNO'}
          </Text>
        </View>

        {/* Metric 3: Active Speed */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>VELOCIDAD</Text>
          <Text style={[styles.metricValue, styles.monoValue]}>
            {speed} / 255
          </Text>
        </View>

        {/* Metric 4: ESP32 Feedback */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>RESPUESTA ESP32</Text>
          <Text style={[styles.metricValue, styles.monoValue]} numberOfLines={1}>
            {lastResponse || '---'}
          </Text>
        </View>
      </View>

      {/* Device summary bar */}
      <View style={styles.deviceSummaryRow}>
        <Ionicons
          name={connectedDevice ? 'link' : 'unlink'}
          size={14}
          color={connectedDevice ? COLORS.success : COLORS.textMuted}
        />
        <Text style={styles.deviceSummaryText} numberOfLines={1}>
          {connectedDevice
            ? `Enlazado: ${connectedDevice.name} (${connectedDevice.address})`
            : 'Sin conexión activa con el ESP32'}
        </Text>
      </View>

      {/* Terminal Logs Collapsible Box */}
      {showLogs && (
        <View style={styles.terminalContainer}>
          <View style={styles.terminalHeader}>
            <Text style={styles.terminalTitle}>REGISTRO DE COMUNICACIÓN SPP</Text>
            <Text style={styles.terminalCount}>{logs.length} eventos</Text>
          </View>
          <ScrollView
            style={styles.terminalScrollView}
            nestedScrollEnabled
            contentContainerStyle={styles.terminalContent}
          >
            {logs.length === 0 ? (
              <Text style={styles.terminalEmpty}>Sin eventos registrados todavía.</Text>
            ) : (
              logs.map((log) => {
                let badgeColor = COLORS.textMuted;
                if (log.direction === 'tx') badgeColor = COLORS.primaryLight;
                if (log.direction === 'rx') badgeColor = COLORS.success;
                if (log.direction === 'error') badgeColor = COLORS.danger;

                return (
                  <View key={log.id} style={styles.logLine}>
                    <Text style={styles.logTimestamp}>[{log.timestamp}]</Text>
                    <Text style={[styles.logBadge, { color: badgeColor }]}>
                      {log.direction.toUpperCase()}
                    </Text>
                    <Text style={styles.logMessage}>{log.message}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
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
    marginBottom: SPACING.xl,
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
  toggleLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  toggleLogText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0E1726',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  monoValue: {
    fontFamily: 'monospace',
    color: COLORS.accent,
  },
  deviceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  deviceSummaryText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  terminalContainer: {
    backgroundColor: '#070D18',
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
  },
  terminalTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  terminalCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  terminalScrollView: {
    maxHeight: 140,
  },
  terminalContent: {
    padding: SPACING.sm,
  },
  terminalEmpty: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  logLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  logTimestamp: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  logBadge: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    width: 48,
  },
  logMessage: {
    color: COLORS.text,
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
});
