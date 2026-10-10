import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function StatTile({ label, value, detail, tone = "light", style }) {
  const dark = tone === "dark";
  const alert = tone === "alert";
  return (
    <View style={[styles.tile, dark && styles.dark, alert && styles.alert, style]}>
      <Text style={[styles.label, dark && styles.labelDark, alert && styles.labelAlert]}>{label}</Text>
      <Text style={[styles.value, dark && styles.valueDark, alert && styles.valueAlert]}>{value}</Text>
      {detail ? <Text style={[styles.detail, dark && styles.detailDark]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  dark: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  alert: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  labelDark: {
    color: colors.accent,
  },
  labelAlert: {
    color: colors.danger,
  },
  value: {
    marginTop: spacing.xs,
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
  },
  valueDark: {
    color: colors.white,
  },
  valueAlert: {
    color: colors.danger,
  },
  detail: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  detailDark: {
    color: colors.border,
  },
});
