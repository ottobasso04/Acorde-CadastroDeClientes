import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import MenuCard from "../../components/MenuCard";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import StatTile from "../../components/StatTile";
import { useAuth } from "../../contexts/AuthContext";
import { API_URL, getErrorMessage } from "../../services/api";
import { getDashboard } from "../../services/storeApi";
import { colors, spacing } from "../../styles/theme";
import { firstName, formatCompactMoney } from "../../utils/format";

export default function AdminHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const isFocused = useIsFocused();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) return;
    let active = true;

    async function load() {
      try {
        const data = await getDashboard(7);
        if (!active) return;
        setDashboard(data);
        setError("");
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar o resumo."));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isFocused]);

  const totals = dashboard?.totais;

  return (
    <ScreenScroll wide>
      <Text style={styles.greeting}>Olá, {firstName(user?.name)}!</Text>
      <Text style={styles.subtitle}>Resumo dos últimos 7 dias da loja.</Text>

      <MessageBanner message={error} />

      <View style={styles.tiles}>
        <StatTile tone="dark" label="Faturamento" value={totals ? formatCompactMoney(totals.faturamento) : "…"} detail="7 dias" />
        <StatTile label="Pedidos" value={totals ? String(totals.pedidos) : "…"} detail={totals ? `${totals.itensVendidos} itens vendidos` : ""} />
        <StatTile
          tone={totals?.itensComEstoqueBaixo ? "alert" : "light"}
          label="Estoque baixo"
          value={totals ? String(totals.itensComEstoqueBaixo) : "…"}
          detail="produtos no mínimo"
        />
        <StatTile label="Em estoque" value={totals ? String(totals.unidadesEmEstoque) : "…"} detail={totals ? `${totals.produtosAtivos} produtos` : ""} />
      </View>

      <MenuCard icon="👥" title="Clientes" subtitle="Cadastro com endereço por CEP e categorias de interesse" onPress={() => navigation.navigate("Clients")} />
      <MenuCard icon="📦" title="Estoque e mercadorias" subtitle="Consultar itens, registrar entradas e ver movimentações" onPress={() => navigation.navigate("Stock")} />
      <MenuCard icon="➕" title="Cadastrar nova mercadoria" subtitle="Incluir um produto novo no estoque da loja" onPress={() => navigation.navigate("ProductForm")} />
      <MenuCard
        icon="📊"
        title="Relatórios e IA"
        subtitle="Entradas e saídas, mais vendidos, vendas por dia e análise do Gemini"
        onPress={() => navigation.navigate("Reports")}
      />

      <AppButton title="Sair" variant="link" onPress={signOut} style={styles.logout} />
      <Text style={styles.footer}>
        {user?.email} · administrador
        {"\n"}API: {API_URL}
      </Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    fontSize: 15,
    color: colors.muted,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
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
