import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";
import { instrumentIcon } from "../utils/instruments";
import { formatPhone } from "../utils/validators";

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
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
      </View>

      <Text style={styles.detail}>{formatPhone(client.phone)}</Text>
      {client.address ? <Text style={styles.detail}>{client.address}</Text> : null}

      {client.instrument ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {instrumentIcon(client.instrument)} {client.instrument}
          </Text>
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
  detail: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  tag: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
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
