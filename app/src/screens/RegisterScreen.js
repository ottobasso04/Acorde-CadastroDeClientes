import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import AppButton from "../components/AppButton";
import FormField from "../components/FormField";
import MessageBanner from "../components/MessageBanner";
import ScreenScroll from "../components/ScreenScroll";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { colors, spacing } from "../styles/theme";
import { hasErrors, validateRegister } from "../utils/validators";

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    setError("");

    const found = validateRegister({ name, email, password, confirmPassword });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "Não foi possível criar a conta."));
      setSubmitting(false);
    }
  }

  return (
    <ScreenScroll hasHeader={false}>
      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.subtitle}>
        Com uma conta você acessa a área de cadastro de clientes da loja.
      </Text>

      <MessageBanner message={error} />

      <FormField
        label="Nome"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Seu nome"
        autoCapitalize="words"
      />
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
        placeholder="Mínimo de 6 caracteres"
        secureTextEntry
        autoCapitalize="none"
      />
      <FormField
        label="Confirmar senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        placeholder="Repita a senha"
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={handleRegister}
      />

      <AppButton title="Criar conta" onPress={handleRegister} loading={submitting} />
      <AppButton
        title="Já tenho conta"
        variant="link"
        onPress={() => navigation.goBack()}
        disabled={submitting}
        style={styles.link}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xl,
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
  link: {
    marginTop: spacing.sm,
  },
});
