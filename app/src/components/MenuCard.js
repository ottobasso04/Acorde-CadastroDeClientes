import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function MenuCard({ icon, title, subtitle, badge, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: {
    backgroundColor: colors.accentSoft,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 22,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  chevron: {
    fontSize: 28,
    color: colors.muted,
  },
});
