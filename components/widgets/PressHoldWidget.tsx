import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HapticPower } from '@/types/fidget';
import { useCharge } from '@/hooks/useCharge';
import ChargeOrb from '@/components/ChargeOrb';

interface PressHoldWidgetProps {
  disabled?: boolean;
  hapticPower?: HapticPower;
}

const ORB_SIZE = 100;

export default function PressHoldWidget({ disabled, hapticPower = 'medium' }: PressHoldWidgetProps) {
  const handle = useCharge({ center: { x: ORB_SIZE / 2, y: ORB_SIZE / 2 }, disabled, hapticPower });
  return (
    <View style={styles.container}>
      <ChargeOrb size={ORB_SIZE} handle={handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
