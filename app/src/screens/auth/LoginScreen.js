import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import FormField from "../../components/FormField";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import SegmentedControl from "../../components/SegmentedControl";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage } from "../../services/api";
import { colors, radius, spacing } from "../../styles/theme";
import { hasErrors, validateLogin } from "../../utils/validators";
import useFormErrors from "../../utils/useFormErrors";

const DEMO = {
  customer: { email: "cliente@acorde.com", password: "acorde123" },
  admin: { email: "admin@acorde.com", password: "acorde123" },
};

const ROLES = [
  { value: "customer", label: "Sou cliente" },
  { value: "admin", label: "Administrador" },
];

const DESCRIPTIONS = {
  customer: "Compre instrumentos e acessórios e peça ajuda ao assistente com IA.",
  admin: "Gerencie clientes, estoque, novas mercadorias e relatórios de vendas.",
};

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { errors, setErrors, field } = useFormErrors();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function changeRole(next) {
    setRole(next);
    setError("");
    setErrors({});
  }

  async function handleLogin() {
    setError("");

    const found = validateLogin({ email, password });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await signIn(email.trim(), password, role);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível entrar."));
      setSubmitting(false);
    }
  }

  function fillDemoAccount() {
    setEmail(DEMO[role].email);
    setPassword(DEMO[role].password);
    setErrors({});
    setError("");
  }

  const isAdmin = role === "admin";

  return (
    <ScreenScroll hasHeader={false}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>♪</Text>
        </View>
        <Text style={styles.title}>Acorde</Text>
        <Text style={styles.subtitle}>Loja online de instrumentos e produtos de música</Text>
      </View>

      <SegmentedControl options={ROLES} value={role} onChange={changeRole} style={styles.tabs} />
      <Text style={styles.roleDescription}>{DESCRIPTIONS[role]}</Text>

      <MessageBanner message={error} />

      <FormField
        label="E-mail"
        value={email}
        onChangeText={field("email", setEmail)}
        error={errors.email}
        placeholder={isAdmin ? "admin@loja.com" : "voce@exemplo.com"}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label="Senha"
        value={password}
        onChangeText={field("password", setPassword)}
        error={errors.password}
        placeholder="Sua senha"
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={handleLogin}
      />

      <AppButton title={isAdmin ? "Entrar como administrador" : "Entrar"} onPress={handleLogin} loading={submitting} />
      {!isAdmin ? (
        <AppButton
          title="Criar conta de cliente"
          variant="link"
          onPress={() => navigation.navigate("Register")}
          disabled={submitting}
          style={styles.link}
        />
      ) : null}

      <View style={styles.demo}>
        <Text style={styles.demoTitle}>Conta de demonstração ({isAdmin ? "administrador" : "cliente"})</Text>
        <Text style={styles.demoText}>
          {DEMO[role].email} · senha {DEMO[role].password}
        </Text>
        <AppButton
          title="Usar a conta de demonstração"
          variant="outline"
          onPress={fillDemoAccount}
          disabled={submitting}
        />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 36,
    color: colors.accent,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.muted,
  },
  tabs: {
    marginBottom: spacing.sm,
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  link: {
    marginTop: spacing.sm,
  },
  demo: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  demoText: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    fontSize: 14,
    color: colors.muted,
  },
});
