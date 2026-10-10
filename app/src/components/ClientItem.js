import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";
import { categoryIcon } from "../utils/categories";
import { formatCep, formatPhone } from "../utils/validators";

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function addressLine(client) {
  if (!client.street) return "";
  const complement = client.complement ? ` - ${client.complement}` : "";
  return `${client.street}, ${client.number}${complement} · ${client.neighborhood}`;
}

export default function ClientItem({ client, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(client.name)}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{client.name}</Text>
          <Text style={styles.detail}>{client.email}</Text>
        </View>
        {client.hasAccount ? (
          <View style={styles.account}>
            <Text style={styles.accountText}>conta na loja</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.detail}>{formatPhone(client.phone)}</Text>
      {client.street ? <Text style={styles.detail}>{addressLine(client)}</Text> : null}
      {client.city ? (
        <Text style={styles.detail}>
          {client.city}/{client.state} · CEP {formatCep(client.cep)}
        </Text>
      ) : null}

      {client.interests.length > 0 ? (
        <View style={styles.tags}>
          {client.interests.map((name) => (
            <View key={name} style={styles.tag}>
              <Text style={styles.tagText}>
                {categoryIcon(name)} {name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${client.name}`}
          onPress={() => onEdit(client)}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.editText}>Editar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${client.name}`}
          onPress={() => onDelete(client)}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.deleteText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  identity: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  account: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  accountText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.info,
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
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
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  actionPressed: {
    backgroundColor: colors.background,
  },
  editText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.danger,
  },
});
