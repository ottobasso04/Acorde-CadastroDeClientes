import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

export default function AiBadge({ result }) {
  if (!result) return null;
  const gemini = result.source === "gemini";

  return (
    <View style={[styles.badge, gemini ? styles.gemini : styles.local]}>
      <Text style={[styles.title, gemini ? styles.titleGemini : styles.titleLocal]}>
        {gemini ? `✨ Gerado pelo Gemini · ${result.model}` : "⚙️ Modo local da loja"}
      </Text>
      {!gemini && result.warning ? <Text style={styles.warning}>{result.warning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  gemini: {
    backgroundColor: colors.infoSoft,
  },
  local: {
    backgroundColor: colors.accentSoft,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
  },
  titleGemini: {
    color: colors.info,
  },
  titleLocal: {
    color: colors.ink,
  },
  warning: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
});
