import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function Chip({ label, selected = false, onPress, accessibilityLabel, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed, style]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  textSelected: {
    color: colors.white,
  },
});
