import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../src/constants/theme';
import { useCarController } from '../src/hooks/useCarController';
import { ConnectionCard } from '../src/components/ConnectionCard';
import { DirectionPad } from '../src/components/DirectionPad';
import { SpeedControl } from '../src/components/SpeedControl';
import { StopButton } from '../src/components/StopButton';
import { StatusCard } from '../src/components/StatusCard';

export default function MainScreen() {
  const {
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
  } = useCarController();

  const isConnected = connectionStatus === 'connected';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <View style={styles.logoIconCircle}>
              <Ionicons name="car-sport" size={26} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.appTitle}>SMART CAR</Text>
              <Text style={styles.appSubtitle}>ESP32 ROBOT CONTROLLER</Text>
            </View>
          </View>

          <View
            style={[
              styles.connectionIndicatorPill,
              isConnected ? styles.pillConnected : styles.pillDisconnected,
            ]}
          >
            <Ionicons
              name={isConnected ? 'shield-checkmark' : 'shield-outline'}
              size={14}
              color={isConnected ? COLORS.success : COLORS.textMuted}
            />
            <Text
              style={[
                styles.connectionIndicatorText,
                isConnected && styles.textConnected,
              ]}
            >
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* Error notification banner if any */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={styles.errorText} numberOfLines={2}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Bluetooth Connection Section */}
        <ConnectionCard
          connectionStatus={connectionStatus}
          connectedDevice={connectedDevice}
          pairedDevices={pairedDevices}
          onConnect={connectDevice}
          onDisconnect={disconnectDevice}
          onRefresh={refreshPairedDevices}
        />

        {/* Directional Pad Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="game-controller" size={18} color={COLORS.primaryLight} />
            <Text style={styles.sectionTitle}>CONTROL DE DIRECCIÓN</Text>
          </View>
          <DirectionPad
            disabled={!isConnected}
            activeCommand={currentCommand}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onEmergencyStop={handleEmergencyStop}
          />
        </View>

        {/* Emergency Stop Button */}
        <StopButton
          onPress={handleEmergencyStop}
          disabled={!isConnected && carState === 'idle'}
        />

        {/* Speed Slider Section */}
        <SpeedControl
          disabled={!isConnected}
          speed={speed}
          onSpeedChange={handleSpeedChange}
        />

        {/* Telemetry and Status Section */}
        <StatusCard
          connectionStatus={connectionStatus}
          connectedDevice={connectedDevice}
          carState={carState}
          lastCommand={currentCommand}
          speed={speed}
          lastResponse={lastResponse}
          logs={logs}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#132342',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  appSubtitle: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  connectionIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  pillConnected: {
    backgroundColor: '#052E16',
    borderColor: COLORS.success,
  },
  pillDisconnected: {
    backgroundColor: '#0F172A',
    borderColor: COLORS.surfaceBorder,
  },
  connectionIndicatorText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textConnected: {
    color: COLORS.success,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#2A0808',
    borderColor: COLORS.danger,
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 12,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
