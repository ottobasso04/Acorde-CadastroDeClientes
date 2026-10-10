import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import FormField from "../../components/FormField";
import MessageBanner from "../../components/MessageBanner";
import { LevelPill } from "../../components/ProductCard";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { addStock, getProduct, listMovements } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";
import { formatDateTime, formatMoney } from "../../utils/format";
import { hasErrors, validateStockEntry } from "../../utils/validators";
import useFormErrors from "../../utils/useFormErrors";

export default function ProductDetailScreen({ navigation, route }) {
  const { productId, created } = route.params;
  const isFocused = useIsFocused();

  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(created ? "Mercadoria cadastrada com sucesso." : "");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const { errors, setErrors, field } = useFormErrors();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [productData, movementData] = await Promise.all([getProduct(productId), listMovements(productId)]);
      setProduct(productData);
      setMovements(movementData);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível carregar a mercadoria."));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  async function handleEntry() {
    setMessage("");
    setError("");
    const found = validateStockEntry({ quantity, note });
    setErrors(found);
    if (hasErrors(found)) return;

    setSaving(true);
    try {
      await addStock(productId, { quantity: Number(quantity), note: note.trim() });
      setMessage(`Entrada de ${quantity} unidade(s) registrada.`);
      setQuantity("");
      setNote("");
      await load();
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "Não foi possível registrar a entrada."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <ScreenScroll>
        <MessageBanner message={error} />
        <AppButton title="Voltar" variant="outline" onPress={() => navigation.goBack()} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <MessageBanner type="success" message={message} />
      <MessageBanner message={error} />

      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.icon}>{product.icon}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>
              {product.sku} · {product.brand} · {product.category}
            </Text>
          </View>
        </View>
        <View style={styles.tags}>
          <LevelPill level={product.level} />
          {!product.active ? <Text style={styles.inactive}>Fora de venda</Text> : null}
        </View>
        {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
        <View style={styles.numbers}>
          <View style={[styles.number, styles.priceBox]}>
            <Text style={styles.numberLabel}>Preço</Text>
            <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(product.price)}
            </Text>
          </View>
          <View style={[styles.number, product.lowStock && styles.numberLow]}>
            <Text style={[styles.numberLabel, product.lowStock && styles.lowText]}>Estoque</Text>
            <Text style={[styles.stock, product.lowStock && styles.lowText]}>{product.stock}</Text>
            <Text style={[styles.numberHint, product.lowStock && styles.lowText]}>mínimo {product.minStock}</Text>
          </View>
        </View>
        <AppButton
          title="Editar mercadoria"
          variant="outline"
          onPress={() => navigation.navigate("ProductForm", { productId: product.id })}
          style={styles.edit}
        />
      </View>

      <SectionTitle title="Registrar entrada de estoque" subtitle="Use quando chegar mercadoria do fornecedor." />
      <View style={styles.row}>
        <FormField
          label="Quantidade"
          value={quantity}
          onChangeText={field("quantity", (text) => setQuantity(text.replace(/\D/g, "")))}
          error={errors.quantity}
          placeholder="Ex.: 10"
          keyboardType="number-pad"
          containerStyle={styles.quantity}
        />
        <FormField
          label="Observação (opcional)"
          value={note}
          onChangeText={field("note", setNote)}
          error={errors.note}
          placeholder="Ex.: Nota fiscal 1234"
          maxLength={200}
          containerStyle={styles.flex}
        />
      </View>
      <AppButton title="Registrar entrada" onPress={handleEntry} loading={saving} />

      <SectionTitle title="Movimentações" subtitle="Entradas e saídas mais recentes deste item." style={styles.section} />
      {movements.length === 0 ? <Text style={styles.empty}>Nenhuma movimentação ainda.</Text> : null}
      {movements.map((movement) => {
        const entry = movement.type === "entrada";
        return (
          <View key={movement.id} style={styles.movement}>
            <Text style={[styles.movementQty, entry ? styles.entry : styles.exit]}>
              {entry ? "+" : "−"}
              {movement.quantity}
            </Text>
            <View style={styles.flex}>
              <Text style={styles.movementTitle}>
                {entry ? "Entrada" : "Saída"} · {movement.reason}
              </Text>
              <Text style={styles.movementMeta}>
                {formatDateTime(movement.created_at)}
                {movement.note ? ` · ${movement.note}` : ""}
              </Text>
            </View>
          </View>
        );
      })}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    fontSize: 36,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  inactive: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.danger,
  },
  description: {
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  numbers: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  number: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  priceBox: {
    flex: 1.4,
  },
  numberLow: {
    backgroundColor: colors.dangerSoft,
  },
  numberLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  numberHint: {
    fontSize: 12,
    color: colors.muted,
  },
  lowText: {
    color: colors.danger,
  },
  price: {
    marginTop: spacing.xs,
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  stock: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
  },
  edit: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  quantity: {
    width: 130,
  },
  flex: {
    flex: 1,
  },
  section: {
    marginTop: spacing.xxl,
  },
  empty: {
    fontSize: 14,
    color: colors.muted,
  },
  movement: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  movementQty: {
    width: 56,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  entry: {
    color: colors.success,
  },
  exit: {
    color: colors.primary,
  },
  movementTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  movementMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
});
