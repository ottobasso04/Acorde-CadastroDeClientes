import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";
import { formatMoney } from "../utils/format";
import AppButton from "./AppButton";

export function stockLabel(product) {
  if (product.stock === 0) return { text: "Esgotado", tone: "danger" };
  if (product.stock <= 3) return { text: `Últimas ${product.stock} unidade(s)`, tone: "warning" };
  return { text: "Em estoque", tone: "success" };
}

export function LevelPill({ level }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{level}</Text>
    </View>
  );
}

export default function ProductCard({ product, inCart = 0, onAdd }) {
  const stock = stockLabel(product);
  const soldOut = product.stock === 0;
  const full = inCart >= Math.min(10, product.stock);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>{product.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.meta}>
            {product.brand} · {product.category}
          </Text>
          <View style={styles.tags}>
            <LevelPill level={product.level} />
            <Text style={[styles.stock, styles[stock.tone]]}>{stock.text}</Text>
          </View>
        </View>
      </View>
      {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
      <View style={styles.bottom}>
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
        <AppButton
          title={soldOut ? "Esgotado" : inCart > 0 ? `No carrinho (${inCart})` : "Adicionar"}
          variant={inCart > 0 ? "outline" : "primary"}
          onPress={() => onAdd(product)}
          disabled={soldOut || full}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  top: {
    flexDirection: "row",
    gap: spacing.md,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 26,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  stock: {
    fontSize: 12,
    fontWeight: "700",
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.accent,
  },
  danger: {
    color: colors.danger,
  },
  description: {
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  button: {
    minWidth: 150,
  },
});
