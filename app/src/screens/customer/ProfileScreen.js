import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import AddressFields from "../../components/AddressFields";
import AppButton from "../../components/AppButton";
import FormField from "../../components/FormField";
import InterestPicker from "../../components/InterestPicker";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { getProfile, updateProfile } from "../../services/storeApi";
import { colors, spacing } from "../../styles/theme";
import { addressFrom, addressPayload, emptyAddress, formatPhone, hasErrors, onlyDigits, validateProfile } from "../../utils/validators";
import useFormErrors from "../../utils/useFormErrors";

export default function ProfileScreen() {
  const { updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [interests, setInterests] = useState([]);
  const { errors, setErrors, field, clearErrors } = useFormErrors();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile = await getProfile();
        if (!active) return;
        setName(profile.name);
        setEmail(profile.email);
        setPhone(formatPhone(profile.phone));
        setAddress(addressFrom(profile));
        setInterests(profile.interests);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar o seu cadastro."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setError("");
    setMessage("");
    const found = validateProfile({ name, phone, address, interests });
    setErrors(found);
    if (hasErrors(found)) return;

    setSaving(true);
    try {
      const saved = await updateProfile({ name: name.trim(), phone: onlyDigits(phone), ...addressPayload(address), interests });
      setAddress(addressFrom(saved));
      await updateUser({ name: saved.name });
      setMessage("Cadastro atualizado com sucesso.");
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "Não foi possível salvar o cadastro."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenScroll>
      <SectionTitle title="Seus dados" />
      <FormField label="Nome completo" value={name} onChangeText={field("name", setName)} error={errors.name} autoCapitalize="words" />
      <FormField label="E-mail" value={email} editable={false} hint="O e-mail é o seu login e não pode ser alterado." />
      <FormField
        label="Telefone com DDD"
        value={phone}
        onChangeText={field("phone", (text) => setPhone(formatPhone(text)))}
        error={errors.phone}
        keyboardType="phone-pad"
        maxLength={15}
      />

      <SectionTitle title="Endereço de entrega" style={styles.section} />
      <AddressFields value={address} onChange={(patch) => {
          setAddress((current) => ({ ...current, ...patch }));
          clearErrors(Object.keys(patch));
        }} errors={errors} />

      <SectionTitle title="Categorias de interesse" subtitle="O assistente usa estas categorias nas recomendações." style={styles.section} />
      <InterestPicker value={interests} onChange={field("interests", setInterests)} error={errors.interests} label="Seus interesses" />

      <MessageBanner type="success" message={message} />
      <MessageBanner message={error || (hasErrors(errors) ? "Confira os campos destacados." : "")} />
      <AppButton title="Salvar alterações" onPress={handleSave} loading={saving} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  section: {
    marginTop: spacing.md,
  },
});
