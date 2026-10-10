import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import AddressFields from "../../components/AddressFields";
import AppButton from "../../components/AppButton";
import FormField from "../../components/FormField";
import InterestPicker from "../../components/InterestPicker";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { colors, spacing } from "../../styles/theme";
import { addressPayload, emptyAddress, formatPhone, hasErrors, onlyDigits, validateRegister } from "../../utils/validators";
import useFormErrors from "../../utils/useFormErrors";

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [interests, setInterests] = useState([]);
  const { errors, setErrors, field, clearErrors } = useFormErrors();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    setError("");

    const found = validateRegister({ name, email, phone, password, confirmPassword, address, interests });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        phone: onlyDigits(phone),
        password,
        ...addressPayload(address),
        interests,
      });
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "Não foi possível criar a conta."));
      setSubmitting(false);
    }
  }

  return (
    <ScreenScroll>
      <Text style={styles.intro}>
        Crie sua conta para comprar na Acorde e receber recomendações do assistente de acordo com os seus interesses.
      </Text>

      <SectionTitle title="Seus dados" />
      <FormField label="Nome completo" value={name} onChangeText={field("name", setName)} error={errors.name} placeholder="Seu nome" autoCapitalize="words" />
      <FormField
        label="E-mail"
        value={email}
        onChangeText={field("email", setEmail)}
        error={errors.email}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label="Telefone com DDD"
        value={phone}
        onChangeText={field("phone", (text) => setPhone(formatPhone(text)))}
        error={errors.phone}
        placeholder="(16) 99123-0001"
        keyboardType="phone-pad"
        maxLength={15}
      />
      <FormField
        label="Senha"
        value={password}
        onChangeText={field("password", setPassword)}
        error={errors.password}
        placeholder="Mínimo de 6 caracteres"
        secureTextEntry
        autoCapitalize="none"
      />
      <FormField
        label="Confirmar senha"
        value={confirmPassword}
        onChangeText={field("confirmPassword", setConfirmPassword)}
        error={errors.confirmPassword}
        placeholder="Repita a senha"
        secureTextEntry
        autoCapitalize="none"
      />

      <SectionTitle title="Endereço de entrega" subtitle="Digite o CEP para preencher a rua, o bairro e a cidade." style={styles.section} />
      <AddressFields value={address} onChange={(patch) => {
          setAddress((current) => ({ ...current, ...patch }));
          clearErrors(Object.keys(patch));
        }} errors={errors} />

      <SectionTitle title="Seus interesses" style={styles.section} />
      <InterestPicker value={interests} onChange={field("interests", setInterests)} error={errors.interests} />

      <MessageBanner message={error || (hasErrors(errors) ? "Confira os campos destacados." : "")} />
      <AppButton title="Criar conta" onPress={handleRegister} loading={submitting} />
      <AppButton title="Já tenho conta" variant="link" onPress={() => navigation.goBack()} disabled={submitting} style={styles.link} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: spacing.xl,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  section: {
    marginTop: spacing.md,
  },
  link: {
    marginTop: spacing.sm,
  },
});
