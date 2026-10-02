import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import FormField from "../components/FormField";
import MessageBanner from "../components/MessageBanner";
import ScreenScroll from "../components/ScreenScroll";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../services/api";
import { colors, radius, spacing } from "../styles/theme";
import { hasErrors, validateLogin } from "../utils/validators";

const DEMO_EMAIL = "demo@acorde.com";
const DEMO_PASSWORD = "acorde123";

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError("");

    const found = validateLogin({ email, password });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível entrar."));
      setSubmitting(false);
    }
  }

  function fillDemoAccount() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    setError("");
  }

  return (
    <ScreenScroll hasHeader={false}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>♪</Text>
        </View>
        <Text style={styles.title}>Acorde</Text>
        <Text style={styles.subtitle}>
          Área de cadastro da loja online de instrumentos e produtos de música
        </Text>
      </View>

      <MessageBanner message={error} />

      <FormField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="Sua senha"
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={handleLogin}
      />

      <AppButton title="Entrar" onPress={handleLogin} loading={submitting} />
      <AppButton
        title="Criar uma conta"
        variant="link"
        onPress={() => navigation.navigate("Register")}
        disabled={submitting}
        style={styles.link}
      />

      <View style={styles.demo}>
        <Text style={styles.demoTitle}>Conta de demonstração</Text>
        <Text style={styles.demoText}>
          {DEMO_EMAIL} · senha {DEMO_PASSWORD}
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
    marginBottom: spacing.xxl,
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
