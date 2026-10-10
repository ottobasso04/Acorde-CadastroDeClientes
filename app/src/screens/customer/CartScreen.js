import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import MessageBanner from "../../components/MessageBanner";
import QuantityStepper from "../../components/QuantityStepper";
import ScreenScroll from "../../components/ScreenScroll";
import { useCart } from "../../contexts/CartContext";
import { getErrorMessage } from "../../services/api";
import { createOrder } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";
import { formatMoney } from "../../utils/format";

export default function CartScreen({ navigation }) {
  const cart = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  async function handleCheckout() {
    setError("");
    setSubmitting(true);
    try {
      const created = await createOrder(cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })));
      setOrder(created);
      cart.clear();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível finalizar a compra."));
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <ScreenScroll>
        <View style={styles.done}>
          <Text style={styles.doneIcon}>🎉</Text>
          <Text style={styles.doneTitle}>Pedido #{order.id} confirmado!</Text>
          <Text style={styles.doneText}>
            {order.itemsCount} item(ns) · total de {formatMoney(order.total)}
          </Text>
        </View>
        <AppButton title="Ver meus pedidos" onPress={() => navigation.navigate("Orders")} />
        <AppButton title="Continuar comprando" variant="outline" onPress={() => navigation.navigate("Shop")} style={styles.spaced} />
      </ScreenScroll>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <ScreenScroll>
        <View style={styles.done}>
          <Text style={styles.doneIcon}>🛒</Text>
          <Text style={styles.doneTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.doneText}>Escolha produtos na loja ou peça sugestões ao assistente.</Text>
        </View>
        <AppButton title="Ir para a loja" onPress={() => navigation.navigate("Shop")} />
        <AppButton title="✨ Perguntar ao assistente" variant="outline" onPress={() => navigation.navigate("Assistant")} style={styles.spaced} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      {cart.lines.map(({ product, quantity }) => (
        <View key={product.id} style={styles.line}>
          <View style={styles.lineTop}>
            <Text style={styles.icon}>{product.icon}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.meta}>
                {product.brand} · {formatMoney(product.price)} cada
              </Text>
            </View>
          </View>
          <View style={styles.lineBottom}>
            <QuantityStepper
              value={quantity}
              onChange={(value) => cart.setQuantity(product.id, value)}
              max={Math.min(cart.maxPerProduct, product.stock)}
              label={product.name}
            />
            <Text style={styles.subtotal}>{formatMoney(product.price * quantity)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${product.name}`} onPress={() => cart.remove(product.id)}>
            <Text style={styles.remove}>Remover</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Itens</Text>
          <Text style={styles.summaryValue}>{cart.count}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatMoney(cart.total)}</Text>
        </View>
        <Text style={styles.note}>O preço e o estoque são conferidos pela loja na finalização.</Text>
      </View>

      <MessageBanner message={error} />
      <AppButton title="Finalizar compra" onPress={handleCheckout} loading={submitting} />
      <AppButton title="Continuar comprando" variant="outline" onPress={() => navigation.navigate("Shop")} disabled={submitting} style={styles.spaced} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  lineTop: {
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
  lineBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  subtotal: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  remove: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
    textAlign: "right",
  },
  summary: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.border,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent,
  },
  total: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.white,
  },
  note: {
    fontSize: 12,
    color: colors.border,
  },
  spaced: {
    marginTop: spacing.md,
  },
  done: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  doneIcon: {
    fontSize: 48,
  },
  doneTitle: {
    marginTop: spacing.md,
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  doneText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
  },
});
