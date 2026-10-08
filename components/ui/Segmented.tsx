import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@/constants/colors';
import { playHaptic } from '@/lib/haptics';

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/** A row of mutually exclusive choices. */
export default function Segmented<T extends string | number>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(o => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              if (selected) return;
              playHaptic('selection', { raw: true });
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.textSelected]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: theme.surfaceLight,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
  },
  textSelected: {
    color: theme.text,
  },
});
