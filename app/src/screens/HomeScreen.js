import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import MessageBanner from "../components/MessageBanner";
import ScreenScroll from "../components/ScreenScroll";
import { useAuth } from "../contexts/AuthContext";
import { API_URL, getErrorMessage } from "../services/api";
import { listClients } from "../services/clientsApi";
import { colors, radius, spacing } from "../styles/theme";
import { INSTRUMENTS } from "../utils/instruments";

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const isFocused = useIsFocused();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    async function loadSummary() {
      try {
        setError("");
        const data = await listClients();
        if (active) setClients(data);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar o resumo."));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [isFocused]);

  const categories = useMemo(
    () =>
      INSTRUMENTS.map((item) => ({
        ...item,
        total: clients.filter((client) => client.instrument === item.name).length,
      })).filter((item) => item.total > 0),
    [clients]
  );

  const firstName = (user?.name ?? "").split(" ")[0];

  return (
    <ScreenScroll>
      <Text style={styles.greeting}>Olá{firstName ? `, ${firstName}` : ""}!</Text>
      <Text style={styles.subtitle}>
        Cadastre e consulte os clientes da loja de instrumentos e produtos de música.
      </Text>

      <MessageBanner message={error} />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Clientes cadastrados</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.summaryLoading} />
        ) : (
          <Text style={styles.summaryNumber}>{clients.length}</Text>
        )}

        {categories.length > 0 ? (
          <View style={styles.categories}>
            {categories.map((item) => (
              <View key={item.name} style={styles.category}>
                <Text style={styles.categoryText}>
                  {item.icon} {item.name}: {item.total}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <AppButton title="Consultar clientes" onPress={() => navigation.navigate("Clients")} />
      <AppButton
        title="Cadastrar novo cliente"
        variant="outline"
        onPress={() => navigation.navigate("ClientForm")}
        style={styles.button}
      />
      <AppButton title="Sair" variant="link" onPress={signOut} style={styles.button} />

      <Text style={styles.footer}>
        {user?.email}
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
    lineHeight: 22,
    color: colors.muted,
  },
  summary: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
  summaryNumber: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.white,
  },
  summaryLoading: {
    alignSelf: "flex-start",
    marginVertical: spacing.lg,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  category: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
  },
  button: {
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: colors.muted,
  },
});
