import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";
import { INSTRUMENTS } from "../utils/instruments";

export default function InstrumentPicker({ value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Categoria de interesse (opcional)</Text>
      <View style={styles.options}>
        {INSTRUMENTS.map((item) => {
          const selected = item.name === value;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? "" : item.name)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {item.icon} {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  optionTextSelected: {
    color: colors.white,
  },
});
