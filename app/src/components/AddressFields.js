import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "../services/api";
import { lookupCep } from "../services/storeApi";
import { colors, spacing } from "../styles/theme";
import { formatCep, onlyDigits } from "../utils/validators";
import AppButton from "./AppButton";
import FormField from "./FormField";

export default function AddressFields({ value, onChange, errors = {} }) {
  const [looking, setLooking] = useState(false);
  const [status, setStatus] = useState(null);
  const lastLookup = useRef(onlyDigits(value.cep).length === 8 ? onlyDigits(value.cep) : "");

  useEffect(() => {
    if (onlyDigits(value.cep).length < 8) lastLookup.current = "";
  }, [value.cep]);

  async function search(cepDigits) {
    lastLookup.current = cepDigits;
    setLooking(true);
    setStatus(null);
    try {
      const address = await lookupCep(cepDigits);
      const patch = { city: address.city, state: address.state };
      if (address.street) patch.street = address.street;
      if (address.neighborhood) patch.neighborhood = address.neighborhood;
      onChange(patch);
      setStatus({
        type: "success",
        message: address.street
          ? "Endereço encontrado. Confira e informe o número."
          : "CEP encontrado. Complete a rua e o bairro.",
      });
    } catch (error) {
      setStatus({ type: "error", message: getErrorMessage(error, "Não foi possível buscar o CEP.") });
    } finally {
      setLooking(false);
    }
  }

  function handleCep(text) {
    const formatted = formatCep(text);
    onChange({ cep: formatted });
    const digits = onlyDigits(formatted);
    if (digits.length === 8 && digits !== lastLookup.current) search(digits);
  }

  const cepDigits = onlyDigits(value.cep);

  return (
    <View>
      <View style={styles.row}>
        <FormField
          label="CEP"
          value={value.cep}
          onChangeText={handleCep}
          error={errors.cep}
          placeholder="00000-000"
          keyboardType="number-pad"
          maxLength={9}
          containerStyle={styles.flex}
        />
        <AppButton
          title="Buscar"
          variant="outline"
          onPress={() => search(cepDigits)}
          disabled={cepDigits.length !== 8}
          loading={looking}
          style={styles.searchButton}
        />
      </View>
      {looking ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.statusText}>Buscando endereço pelo CEP…</Text>
        </View>
      ) : status ? (
        <Text style={[styles.statusText, styles.status, status.type === "error" ? styles.statusError : styles.statusOk]}>
          {status.message}
        </Text>
      ) : null}

      <FormField
        label="Rua"
        value={value.street}
        onChangeText={(street) => onChange({ street })}
        error={errors.street}
        placeholder="Rua, avenida, travessa…"
      />
      <View style={styles.row}>
        <FormField
          label="Número"
          value={value.number}
          onChangeText={(number) => onChange({ number })}
          error={errors.number}
          placeholder="123 ou S/N"
          maxLength={10}
          containerStyle={styles.small}
        />
        <FormField
          label="Complemento"
          value={value.complement}
          onChangeText={(complement) => onChange({ complement })}
          error={errors.complement}
          placeholder="Apto, bloco, casa (opcional)"
          maxLength={60}
          containerStyle={styles.flex}
        />
      </View>
      <FormField
        label="Bairro"
        value={value.neighborhood}
        onChangeText={(neighborhood) => onChange({ neighborhood })}
        error={errors.neighborhood}
        placeholder="Bairro"
      />
      <View style={styles.row}>
        <FormField
          label="Cidade"
          value={value.city}
          onChangeText={(city) => onChange({ city })}
          error={errors.city}
          placeholder="Cidade"
          containerStyle={styles.flex}
        />
        <FormField
          label="UF"
          value={value.state}
          onChangeText={(state) => onChange({ state: state.toUpperCase().replace(/[^A-Z]/g, "") })}
          error={errors.state}
          placeholder="SP"
          autoCapitalize="characters"
          maxLength={2}
          containerStyle={styles.uf}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  small: {
    width: 120,
  },
  uf: {
    width: 84,
  },
  searchButton: {
    marginTop: 22,
    minWidth: 104,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: 13,
    color: colors.muted,
  },
  statusOk: {
    color: colors.success,
  },
  statusError: {
    color: colors.danger,
  },
});
