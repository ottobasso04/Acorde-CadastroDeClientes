import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function MessageBanner({ type = "error", message }) {
  if (!message) return null;

  const success = type === "success";

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, success ? styles.success : styles.error]}
    >
      <Text style={[styles.text, success ? styles.successText : styles.errorText]}>{message}</Text>
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
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.danger,
  },
});
