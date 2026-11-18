import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { BLUETOOTH_CONSTANTS } from '../constants/bluetooth';
import { speedToPercentage } from '../utils/commandParser';

interface SpeedControlProps {
  disabled: boolean;
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
}

export const SpeedControl: React.FC<SpeedControlProps> = ({
  disabled,
  speed,
  onSpeedChange,
}) => {
  const [localSpeed, setLocalSpeed] = useState<number>(speed);

  // Keep local state in sync if external speed changes
  useEffect(() => {
    setLocalSpeed(speed);
  }, [speed]);

  const percentage = speedToPercentage(localSpeed);

  const presets = [
    { label: '25%', value: 64 },
    { label: '50%', value: 128 },
    { label: '75%', value: 191 },
    { label: 'MAX', value: 255 },
  ];

  const handlePreset = (val: number) => {
    if (disabled) return;
    setLocalSpeed(val);
    onSpeedChange(val);
  };

  return (
    <View style={[styles.card, disabled && styles.disabledCard]}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="speedometer-outline" size={20} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>CONTROL DE VELOCIDAD</Text>
        </View>

        <View style={styles.valueBadge}>
          <Text style={styles.numericValue}>{Math.round(localSpeed)}</Text>
          <Text style={styles.percentageValue}>({percentage}%)</Text>
        </View>
      </View>

      {/* Slider Control */}
      <View style={styles.sliderContainer}>
        <Text style={styles.minMaxLabel}>0</Text>
        <Slider
          style={styles.slider}
          minimumValue={BLUETOOTH_CONSTANTS.MIN_SPEED}
          maximumValue={BLUETOOTH_CONSTANTS.MAX_SPEED}
          step={1}
          value={localSpeed}
          onValueChange={(val) => setLocalSpeed(val)}
          onSlidingComplete={(val) => onSpeedChange(val)}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.sliderTrack}
          thumbTintColor={COLORS.accent}
          disabled={disabled}
        />
        <Text style={styles.minMaxLabel}>255</Text>
      </View>

      {/* Quick Speed Presets */}
      <View style={styles.presetsRow}>
        {presets.map((preset) => {
          const isActive = Math.abs(localSpeed - preset.value) <= 10;
          return (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetButton,
                isActive && styles.activePresetButton,
                disabled && styles.disabledPreset,
              ]}
              onPress={() => handlePreset(preset.value)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.presetText,
                  isActive && styles.activePresetText,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  disabledCard: {
    opacity: 0.4,
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
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#0F172A',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  numericValue: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  percentageValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  minMaxLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePresetButton: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryLight,
  },
  disabledPreset: {
    opacity: 0.6,
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  activePresetText: {
    color: COLORS.text,
  },
});
