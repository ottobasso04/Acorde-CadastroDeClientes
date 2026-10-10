import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";
import { formatMoney } from "../utils/format";
import AppButton from "./AppButton";
import { LevelPill } from "./ProductCard";

const TYPE_COLORS = {
  melhor_preco: colors.success,
  melhor_desempenho: colors.primary,
  custo_beneficio: colors.info,
};

export default function RecommendationCard({ item, inCart = 0, onAdd }) {
  const { product } = item;
  const full = inCart >= Math.min(10, product.stock);

  return (
    <View style={styles.card}>
      <View style={[styles.type, { backgroundColor: TYPE_COLORS[item.tipo] ?? colors.ink }]}>
        <Text style={styles.typeText}>{item.tipoLabel}</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.icon}>{product.icon}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.meta}>
            {product.brand} · {product.category}
          </Text>
        </View>
        <LevelPill level={product.level} />
      </View>
      <Text style={styles.reason}>{item.motivo}</Text>
      <View style={styles.bottom}>
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
        <AppButton
          title={inCart > 0 ? `No carrinho (${inCart})` : "Adicionar ao carrinho"}
          variant={inCart > 0 ? "outline" : "primary"}
          onPress={() => onAdd(product)}
          disabled={full}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  type: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    fontSize: 28,
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
  reason: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  bottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  button: {
    minWidth: 190,
  },
});
