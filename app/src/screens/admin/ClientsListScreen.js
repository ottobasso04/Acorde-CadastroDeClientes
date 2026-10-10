import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import AppButton from "../../components/AppButton";
import ClientItem from "../../components/ClientItem";
import ConfirmModal from "../../components/ConfirmModal";
import ListScreen from "../../components/ListScreen";
import MessageBanner from "../../components/MessageBanner";
import { getErrorMessage } from "../../services/api";
import { deleteClient, listClients } from "../../services/clientsApi";
import { colors, radius, spacing } from "../../styles/theme";

export default function ClientsListScreen({ navigation }) {
  const isFocused = useIsFocused();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const lastRequest = useRef(0);

  const loadClients = useCallback(async (term) => {
    const requestNumber = ++lastRequest.current;
    try {
      const data = await listClients(term);
      if (requestNumber !== lastRequest.current) return;
      setClients(data);
      setError("");
    } catch (requestError) {
      if (requestNumber !== lastRequest.current) return;
      setError(getErrorMessage(requestError, "Não foi possível carregar os clientes."));
    } finally {
      if (requestNumber === lastRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const timer = setTimeout(() => loadClients(search), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [isFocused, search, loadClients]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  async function handleConfirmDelete() {
    const client = clientToDelete;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
      setError("");
      setMessage("Cliente excluído com sucesso.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível excluir o cliente."));
    } finally {
      setDeleting(false);
      setClientToDelete(null);
    }
  }

  return (
    <ListScreen maxWidth={640}>
      <View style={styles.toolbar}>
        <TextInput
          accessibilityLabel="Buscar cliente por nome, e-mail ou cidade"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome, e-mail ou cidade"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        <AppButton title="Novo" onPress={() => navigation.navigate("ClientForm")} />
      </View>

      <MessageBanner type="success" message={message} />
      <MessageBanner message={error} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ClientItem
              client={item}
              onEdit={(client) => navigation.navigate("ClientForm", { clientId: client.id })}
              onDelete={setClientToDelete}
            />
          )}
          ListHeaderComponent={
            clients.length > 0 ? (
              <Text style={styles.count}>
                {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search.trim() ? `Nenhum cliente encontrado para “${search.trim()}”.` : "Nenhum cliente cadastrado ainda."}
            </Text>
          }
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadClients(search);
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}

      <ConfirmModal
        visible={clientToDelete !== null}
        title="Excluir cliente"
        message={`Deseja excluir ${clientToDelete?.name ?? "este cliente"}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setClientToDelete(null)}
      />
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
