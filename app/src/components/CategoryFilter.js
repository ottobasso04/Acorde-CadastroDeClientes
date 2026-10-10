import { ScrollView, StyleSheet } from "react-native";

import { spacing } from "../styles/theme";
import { CATEGORIES } from "../utils/categories";
import Chip from "./Chip";

export default function CategoryFilter({ value, onChange, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={[styles.scroll, style]}
    >
      <Chip label="Todas" selected={!value} onPress={() => onChange(null)} />
      {CATEGORIES.map((item) => (
        <Chip
          key={item.name}
          label={`${item.icon} ${item.name}`}
          accessibilityLabel={item.name}
          selected={value === item.name}
          onPress={() => onChange(value === item.name ? null : item.name)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
