import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../styles/theme";
import { CATEGORIES } from "../utils/categories";
import Chip from "./Chip";

export default function InterestPicker({
  value,
  onChange,
  error,
  label = "Categorias de interesse",
  hint = "Escolha uma ou mais categorias.",
  max,
}) {
  function toggle(name) {
    if (value.includes(name)) {
      onChange(value.filter((item) => item !== name));
    } else if (!max || value.length < max) {
      onChange([...value, name]);
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {value.length > 0 ? <Text style={styles.count}> · {value.length} selecionada(s)</Text> : null}
      </Text>
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.options}>
        {CATEGORIES.map((item) => (
          <Chip
            key={item.name}
            label={`${item.icon} ${item.name}`}
            accessibilityLabel={item.name}
            selected={value.includes(item.name)}
            onPress={() => toggle(item.name)}
          />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  },
  count: {
    fontWeight: "400",
    color: colors.muted,
  },
  hint: {
    marginTop: 2,
    marginBottom: spacing.sm,
    fontSize: 13,
    color: colors.muted,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  error: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.danger,
  },
});
