import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../styles/theme";

export default function SectionTitle({ title, subtitle, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
});
