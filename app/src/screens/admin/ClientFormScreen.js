import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AddressFields from "../../components/AddressFields";
import AppButton from "../../components/AppButton";
import FormField from "../../components/FormField";
import InterestPicker from "../../components/InterestPicker";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { createClient, getClient, updateClient } from "../../services/clientsApi";
import { colors, spacing } from "../../styles/theme";
import {
  addressFrom,
  addressPayload,
  emptyAddress,
  formatPhone,
  hasErrors,
  onlyDigits,
  validateClient,
} from "../../utils/validators";
import useFormErrors from "../../utils/useFormErrors";

export default function ClientFormScreen({ navigation, route }) {
  const clientId = route.params?.clientId;
  const editing = Boolean(clientId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [interests, setInterests] = useState([]);
  const [hasAccount, setHasAccount] = useState(false);

  const { errors, setErrors, field, clearErrors } = useFormErrors();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(editing);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let active = true;

    async function loadClient() {
      try {
        const client = await getClient(clientId);
        if (!active) return;
        setName(client.name);
        setEmail(client.email);
        setPhone(formatPhone(client.phone));
        setAddress(addressFrom(client));
        setInterests(client.interests);
        setHasAccount(client.hasAccount);
      } catch (requestError) {
        if (!active) return;
        setLoadFailed(true);
        setError(getErrorMessage(requestError, "Não foi possível carregar o cliente."));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClient();
    return () => {
      active = false;
    };
  }, [clientId, editing]);

  async function handleSave() {
    setError("");
    setMessage("");

    const found = validateClient({ name, email, phone, address, interests });
    setErrors(found);
    if (hasErrors(found)) return;

    const client = {
      name: name.trim(),
      email: email.trim(),
      phone: onlyDigits(phone),
      ...addressPayload(address),
      interests,
    };

    setSaving(true);
    try {
      if (editing) {
        const saved = await updateClient(clientId, client);
        setAddress(addressFrom(saved));
        setMessage("Cliente atualizado com sucesso.");
      } else {
        await createClient(client);
        setMessage("Cliente cadastrado com sucesso.");
        setName("");
        setEmail("");
        setPhone("");
        setAddress(emptyAddress);
        setInterests([]);
      }
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "Não foi possível salvar o cliente."));
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

  if (loadFailed) {
    return (
      <ScreenScroll>
        <MessageBanner message={error} />
        <AppButton title="Voltar" variant="outline" onPress={() => navigation.goBack()} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Text style={styles.intro}>
        {editing ? "Altere os dados e salve para atualizar o cadastro." : "Preencha os dados do cliente. O endereço é completado a partir do CEP."}
      </Text>

      <SectionTitle title="Dados do cliente" />
      <FormField label="Nome completo" value={name} onChangeText={field("name", setName)} error={errors.name} placeholder="Ex.: Ana Souza" autoCapitalize="words" />
      <FormField
        label="E-mail"
        value={email}
        onChangeText={field("email", setEmail)}
        error={errors.email}
        placeholder="cliente@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!hasAccount}
        hint={hasAccount ? "Este cliente tem conta na loja; o e-mail é o login dele." : undefined}
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

      <SectionTitle title="Endereço" style={styles.section} />
      <AddressFields value={address} onChange={(patch) => {
          setAddress((current) => ({ ...current, ...patch }));
          clearErrors(Object.keys(patch));
        }} errors={errors} />

      <SectionTitle title="Categorias de interesse" style={styles.section} />
      <InterestPicker value={interests} onChange={field("interests", setInterests)} error={errors.interests} label="Interesses do cliente" />

      <MessageBanner type="success" message={message} />
      <MessageBanner message={error || (hasErrors(errors) ? "Confira os campos destacados." : "")} />

      <AppButton title={editing ? "Salvar alterações" : "Cadastrar cliente"} onPress={handleSave} loading={saving} />
      <AppButton
        title="Ver lista de clientes"
        variant="outline"
        onPress={() => navigation.popTo("Clients")}
        disabled={saving}
        style={styles.button}
      />
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
  intro: {
    marginBottom: spacing.xl,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  section: {
    marginTop: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
});
