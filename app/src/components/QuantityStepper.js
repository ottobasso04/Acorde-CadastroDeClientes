import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function QuantityStepper({ value, onChange, min = 1, max = 10, label = "produto" }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Diminuir quantidade de ${label}`}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.button, value <= min && styles.disabled]}
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Aumentar quantidade de ${label}`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.button, value >= max && styles.disabled]}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.35,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  value: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    paddingHorizontal: spacing.xs,
  },
});
