import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import FormField from "../components/FormField";
import InstrumentPicker from "../components/InstrumentPicker";
import MessageBanner from "../components/MessageBanner";
import ScreenScroll from "../components/ScreenScroll";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { createClient, getClient, updateClient } from "../services/clientsApi";
import { colors, spacing } from "../styles/theme";
import { formatPhone, hasErrors, onlyDigits, validateClient } from "../utils/validators";

export default function ClientFormScreen({ navigation, route }) {
  const clientId = route.params?.clientId;
  const editing = Boolean(clientId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instrument, setInstrument] = useState("");

  const [errors, setErrors] = useState({});
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
        setAddress(client.address);
        setInstrument(client.instrument);
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

    const client = {
      name: name.trim(),
      email: email.trim(),
      phone: onlyDigits(phone),
      address: address.trim(),
      instrument,
    };

    const found = validateClient(client);
    setErrors(found);
    if (hasErrors(found)) return;

    setSaving(true);
    try {
      if (editing) {
        await updateClient(clientId, client);
        setMessage("Cliente atualizado com sucesso.");
      } else {
        await createClient(client);
        setMessage("Cliente cadastrado com sucesso.");
        setName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setInstrument("");
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
        {editing
          ? "Altere os dados e salve para atualizar o cadastro."
          : "Preencha os dados do cliente. Nome, e-mail e telefone são obrigatórios."}
      </Text>

      <FormField
        label="Nome completo"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Ex.: Ana Souza"
        autoCapitalize="words"
      />
      <FormField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="cliente@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label="Telefone com DDD"
        value={phone}
        onChangeText={(text) => setPhone(formatPhone(text))}
        error={errors.phone}
        placeholder="(16) 99123-0001"
        keyboardType="phone-pad"
        maxLength={15}
      />
      <FormField
        label="Endereço de entrega (opcional)"
        value={address}
        onChangeText={setAddress}
        error={errors.address}
        placeholder="Rua, número, bairro, cidade/UF"
        maxLength={200}
        multiline
        style={styles.address}
      />
      <InstrumentPicker value={instrument} onChange={setInstrument} />
      {errors.instrument ? <Text style={styles.fieldError}>{errors.instrument}</Text> : null}

      <MessageBanner type="success" message={message} />
      <MessageBanner message={error} />

      <AppButton
        title={editing ? "Salvar alterações" : "Cadastrar cliente"}
        onPress={handleSave}
        loading={saving}
      />
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
  address: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  fieldError: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    fontSize: 13,
    color: colors.danger,
  },
  button: {
    marginTop: spacing.md,
  },
});
