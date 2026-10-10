import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

const TONES = {
  error: { background: colors.dangerSoft, border: colors.danger, text: colors.danger },
  success: { background: colors.successSoft, border: colors.success, text: colors.success },
  info: { background: colors.infoSoft, border: colors.info, text: colors.info },
  warning: { background: colors.accentSoft, border: colors.accent, text: colors.ink },
};

export default function MessageBanner({ type = "error", message, style }) {
  if (!message) return null;
  const tone = TONES[type] ?? TONES.error;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: tone.background, borderColor: tone.border }, style]}
    >
      <Text style={[styles.text, { color: tone.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
