import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import ListScreen from "../../components/ListScreen";
import MessageBanner from "../../components/MessageBanner";
import { getErrorMessage } from "../../services/api";
import { listOrders } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";
import { formatDateTime, formatMoney } from "../../utils/format";

export default function OrdersScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) return;
    let active = true;

    async function load() {
      try {
        const data = await listOrders();
        if (!active) return;
        setOrders(data);
        setError("");
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar os pedidos."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isFocused]);

  return (
    <ListScreen maxWidth={640}>
      <MessageBanner message={error} />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View>
              <Text style={styles.empty}>Você ainda não fez nenhum pedido.</Text>
              <AppButton title="Ir para a loja" onPress={() => navigation.navigate("Shop")} />
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Pedido #{item.id}</Text>
                <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
              </View>
              {item.items.map((line) => (
                <View key={line.productId} style={styles.line}>
                  <Text style={styles.lineName}>
                    {line.quantity}× {line.name}
                  </Text>
                  <Text style={styles.lineValue}>{formatMoney(line.subtotal)}</Text>
                </View>
              ))}
              <View style={styles.footer}>
                <Text style={styles.status}>✓ Concluído</Text>
                <Text style={styles.total}>{formatMoney(item.total)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: spacing.xxl,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    marginVertical: spacing.xl,
    fontSize: 15,
    textAlign: "center",
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },
  date: {
    fontSize: 13,
    color: colors.muted,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 2,
  },
  lineName: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  lineValue: {
    fontSize: 14,
    color: colors.muted,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.success,
  },
  total: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
});
