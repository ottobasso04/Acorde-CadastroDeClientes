import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";
import { formatMoney } from "../utils/format";

export default function ProductRow({ product, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${product.name}`}
      onPress={() => onPress(product)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, !product.active && styles.inactive]}
    >
      <Text style={styles.icon}>{product.icon}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>
          {product.sku} · {product.brand} · {formatMoney(product.price)}
          {!product.active ? " · inativa" : ""}
        </Text>
      </View>
      <View style={[styles.stock, product.lowStock && styles.stockLow]}>
        <Text style={[styles.stockValue, product.lowStock && styles.stockValueLow]}>{product.stock}</Text>
        <Text style={[styles.stockLabel, product.lowStock && styles.stockValueLow]}>
          {product.lowStock ? "baixo" : "em estoque"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.accentSoft,
  },
  inactive: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  stock: {
    minWidth: 76,
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  stockLow: {
    backgroundColor: colors.dangerSoft,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.success,
  },
  stockValueLow: {
    color: colors.danger,
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
  },
});
