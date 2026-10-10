import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function SegmentedControl({ options, value, onChange, style, dark = false }) {
  return (
    <View accessibilityRole="tablist" style={[styles.track, dark && styles.trackDark, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text style={[styles.text, dark && styles.textDark, selected && styles.textSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  trackDark: {
    backgroundColor: colors.inkSoft,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  textDark: {
    color: colors.border,
  },
  textSelected: {
    color: colors.white,
  },
});
