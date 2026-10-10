import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput } from "react-native";

import CategoryFilter from "../../components/CategoryFilter";
import ListScreen from "../../components/ListScreen";
import MessageBanner from "../../components/MessageBanner";
import ProductCard from "../../components/ProductCard";
import SegmentedControl from "../../components/SegmentedControl";
import { useCart } from "../../contexts/CartContext";
import { getErrorMessage } from "../../services/api";
import { listProducts } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";

const SORTS = [
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
];

export default function ShopScreen() {
  const cart = useCart();
  const isFocused = useIsFocused();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState("price_asc");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lastRequest = useRef(0);

  const load = useCallback(async (filters) => {
    const requestNumber = ++lastRequest.current;
    try {
      const data = await listProducts(filters);
      if (requestNumber !== lastRequest.current) return;
      setProducts(data);
      setError("");
    } catch (requestError) {
      if (requestNumber === lastRequest.current) setError(getErrorMessage(requestError, "Não foi possível carregar os produtos."));
    } finally {
      if (requestNumber === lastRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const timer = setTimeout(() => load({ search, category, sort }), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [isFocused, search, category, sort, load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  function handleAdd(product) {
    const added = cart.add(product);
    setNotice(added ? `${product.name} foi para o carrinho.` : "Você já tem a quantidade máxima deste produto no carrinho.");
  }

  return (
    <ListScreen>
      <TextInput
        accessibilityLabel="Buscar produtos"
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por produto, marca ou categoria"
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        style={styles.search}
      />
      <SegmentedControl options={SORTS} value={sort} onChange={setSort} style={styles.sort} />
      <CategoryFilter value={category} onChange={setCategory} />

      <MessageBanner type="success" message={notice} />
      <MessageBanner message={error} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ProductCard product={item} inCart={cart.quantityOf(item.id)} onAdd={handleAdd} />}
          ListHeaderComponent={
            products.length > 0 ? (
              <Text style={styles.count}>
                {products.length} produto(s) · {sort === "price_asc" ? "do mais barato ao mais caro" : "do mais caro ao mais barato"}
              </Text>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>Nenhum produto encontrado com esses filtros.</Text>}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  sort: {
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
