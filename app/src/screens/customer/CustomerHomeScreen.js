import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import MenuCard from "../../components/MenuCard";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { API_URL, getErrorMessage } from "../../services/api";
import { getProfile, listProducts } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";
import { categoryIcon } from "../../utils/categories";
import { firstName, formatMoney } from "../../utils/format";

export default function CustomerHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const cart = useCart();
  const isFocused = useIsFocused();

  const [interests, setInterests] = useState([]);
  const [productCount, setProductCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) return;
    let active = true;

    async function load() {
      try {
        const [profile, products] = await Promise.all([getProfile(), listProducts()]);
        if (!active) return;
        setInterests(profile.interests);
        setProductCount(products.length);
        setError("");
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar a página inicial."));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isFocused]);

  return (
    <ScreenScroll>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Olá, {firstName(user?.name)}!</Text>
        <Text style={styles.heroText}>
          Não precisa vasculhar a loja: diga o que procura e o assistente com IA compara preço e desempenho para você.
        </Text>
        <AppButton title="✨ Perguntar ao assistente" onPress={() => navigation.navigate("Assistant")} style={styles.heroButton} />
      </View>

      <MessageBanner message={error} />

      {interests.length > 0 ? (
        <View style={styles.interests}>
          <Text style={styles.interestsTitle}>Seus interesses</Text>
          <View style={styles.tags}>
            {interests.map((name) => (
              <View key={name} style={styles.tag}>
                <Text style={styles.tagText}>
                  {categoryIcon(name)} {name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <MenuCard
        icon="🛍️"
        title="Loja"
        subtitle={productCount === null ? "Instrumentos, áudio e acessórios" : `${productCount} produtos, do mais barato ao mais caro`}
        onPress={() => navigation.navigate("Shop")}
      />
      <MenuCard
        icon="🛒"
        title="Carrinho"
        subtitle={cart.count > 0 ? `Total de ${formatMoney(cart.total)}` : "Seu carrinho está vazio"}
        badge={cart.count > 0 ? String(cart.count) : null}
        onPress={() => navigation.navigate("Cart")}
      />
      <MenuCard icon="📦" title="Meus pedidos" subtitle="Acompanhe as suas compras" onPress={() => navigation.navigate("Orders")} />
      <MenuCard
        icon="👤"
        title="Meu cadastro"
        subtitle="Endereço de entrega e categorias de interesse"
        onPress={() => navigation.navigate("Profile")}
      />

      <AppButton title="Sair" variant="link" onPress={signOut} style={styles.logout} />
      <Text style={styles.footer}>
        {user?.email}
        {"\n"}API: {API_URL}
      </Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
  },
  heroText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.border,
  },
  heroButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
  },
  interests: {
    marginBottom: spacing.lg,
  },
  interestsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  logout: {
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: colors.muted,
  },
});
