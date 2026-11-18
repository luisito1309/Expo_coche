import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { CarMovement } from '../types/car';

interface DirectionPadProps {
  disabled: boolean;
  activeCommand: CarMovement;
  onPressIn: (cmd: CarMovement) => void;
  onPressOut: () => void;
  onEmergencyStop: () => void;
}

export const DirectionPad: React.FC<DirectionPadProps> = ({
  disabled,
  activeCommand,
  onPressIn,
  onPressOut,
  onEmergencyStop,
}) => {
  const isForward = activeCommand === 'F';
  const isBackward = activeCommand === 'B';
  const isLeft = activeCommand === 'L';
  const isRight = activeCommand === 'R';
  const isStop = activeCommand === 'S';

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      {/* Top Row: UP / FORWARD */}
      <View style={styles.rowCenter}>
        <TouchableOpacity
          style={[
            styles.padButton,
            styles.upButton,
            isForward && styles.activeButton,
          ]}
          onPressIn={() => !disabled && onPressIn('F')}
          onPressOut={() => !disabled && onPressOut()}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons
            name="caret-up"
            size={36}
            color={isForward ? COLORS.text : COLORS.accent}
          />
          <Text style={[styles.buttonLabel, isForward && styles.activeText]}>ADELANTE</Text>
        </TouchableOpacity>
      </View>

      {/* Middle Row: LEFT, CENTER (STOP), RIGHT */}
      <View style={styles.middleRow}>
        {/* LEFT */}
        <TouchableOpacity
          style={[
            styles.padButton,
            styles.sideButton,
            isLeft && styles.activeButton,
          ]}
          onPressIn={() => !disabled && onPressIn('L')}
          onPressOut={() => !disabled && onPressOut()}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons
            name="caret-back"
            size={34}
            color={isLeft ? COLORS.text : COLORS.accent}
          />
          <Text style={[styles.buttonLabel, isLeft && styles.activeText]}>IZQ</Text>
        </TouchableOpacity>

        {/* CENTER STOP */}
        <TouchableOpacity
          style={[
            styles.centerButton,
            isStop && styles.activeCenterButton,
          ]}
          onPress={onEmergencyStop}
          activeOpacity={0.7}
        >
          <View style={styles.centerInnerCircle}>
            <Ionicons name="stop" size={26} color={COLORS.text} />
            <Text style={styles.centerButtonText}>STOP</Text>
          </View>
        </TouchableOpacity>

        {/* RIGHT */}
        <TouchableOpacity
          style={[
            styles.padButton,
            styles.sideButton,
            isRight && styles.activeButton,
          ]}
          onPressIn={() => !disabled && onPressIn('R')}
          onPressOut={() => !disabled && onPressOut()}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons
            name="caret-forward"
            size={34}
            color={isRight ? COLORS.text : COLORS.accent}
          />
          <Text style={[styles.buttonLabel, isRight && styles.activeText]}>DER</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Row: DOWN / BACKWARD */}
      <View style={styles.rowCenter}>
        <TouchableOpacity
          style={[
            styles.padButton,
            styles.downButton,
            isBackward && styles.activeButton,
          ]}
          onPressIn={() => !disabled && onPressIn('B')}
          onPressOut={() => !disabled && onPressOut()}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons
            name="caret-down"
            size={36}
            color={isBackward ? COLORS.text : COLORS.accent}
          />
          <Text style={[styles.buttonLabel, isBackward && styles.activeText]}>ATRÁS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  disabledContainer: {
    opacity: 0.35,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.sm,
  },
  padButton: {
    backgroundColor: '#152238',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#223555',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  upButton: {
    width: 96,
    height: 80,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    paddingTop: 4,
  },
  downButton: {
    width: 96,
    height: 80,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    paddingBottom: 4,
  },
  sideButton: {
    width: 80,
    height: 96,
    borderRadius: RADIUS.lg,
  },
  centerButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.dangerDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#B91C1C',
    elevation: 6,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  centerInnerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  activeButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
    transform: [{ scale: 0.96 }],
  },
  activeCenterButton: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.text,
    transform: [{ scale: 0.95 }],
  },
  buttonLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeText: {
    color: COLORS.text,
  },
});
