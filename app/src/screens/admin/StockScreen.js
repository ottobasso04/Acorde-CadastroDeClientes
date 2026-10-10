import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import AppButton from "../../components/AppButton";
import CategoryFilter from "../../components/CategoryFilter";
import ListScreen from "../../components/ListScreen";
import MessageBanner from "../../components/MessageBanner";
import ProductRow from "../../components/ProductRow";
import SegmentedControl from "../../components/SegmentedControl";
import { getErrorMessage } from "../../services/api";
import { listProducts } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";

const FILTERS = [
  { value: "all", label: "Todos os itens" },
  { value: "low", label: "Estoque baixo" },
];

export default function StockScreen({ navigation }) {
  const isFocused = useIsFocused();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [filter, setFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  const load = useCallback(async (options) => {
    const requestNumber = ++lastRequest.current;
    try {
      const data = await listProducts(options);
      if (requestNumber !== lastRequest.current) return;
      setProducts(data);
      setError("");
    } catch (requestError) {
      if (requestNumber === lastRequest.current) setError(getErrorMessage(requestError, "Não foi possível carregar o estoque."));
    } finally {
      if (requestNumber === lastRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const low = filter === "low";
    const options = { search, category, lowStock: low, sort: low ? "stock" : "name", includeInactive: true };
    const timer = setTimeout(() => load(options), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [isFocused, search, category, filter, load]);

  const units = products.reduce((sum, product) => sum + product.stock, 0);

  return (
    <ListScreen>
      <View style={styles.toolbar}>
        <TextInput
          accessibilityLabel="Buscar mercadoria"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome, marca ou categoria"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          style={styles.search}
        />
        <AppButton title="+ Nova" onPress={() => navigation.navigate("ProductForm")} />
      </View>
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} style={styles.filter} />
      <CategoryFilter value={category} onChange={setCategory} />

      <MessageBanner message={error} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductRow product={item} onPress={(product) => navigation.navigate("ProductDetail", { productId: product.id })} />
          )}
          ListHeaderComponent={
            products.length > 0 ? (
              <Text style={styles.count}>
                {products.length} mercadoria(s) · {units} unidade(s) em estoque
              </Text>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma mercadoria encontrada.</Text>}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  search: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  filter: {
    marginBottom: spacing.md,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  count: {
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  empty: {
    marginTop: spacing.xl,
    fontSize: 15,
    textAlign: "center",
    color: colors.muted,
  },
});
