import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function FormField({ label, error, hint, style, containerStyle, editable = true, ...inputProps }) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        editable={editable}
        style={[styles.input, !editable && styles.readOnly, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.ink,
  },
  readOnly: {
    backgroundColor: colors.background,
    color: colors.muted,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.danger,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.muted,
  },
});
