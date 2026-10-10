import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import Chip from "../../components/Chip";
import FormField from "../../components/FormField";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import SegmentedControl from "../../components/SegmentedControl";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { createProduct, getProduct, updateProduct } from "../../services/storeApi";
import { colors, spacing } from "../../styles/theme";
import { CATEGORIES, LEVELS } from "../../utils/categories";
import { formatMoneyInput, hasErrors, parseMoney, validateProduct } from "../../utils/validators";
import useFormErrors from "../../utils/useFormErrors";

const LEVEL_OPTIONS = LEVELS.map((level) => ({ value: level, label: level }));
const STATUS_OPTIONS = [
  { value: "active", label: "À venda" },
  { value: "inactive", label: "Fora de venda" },
];

export default function ProductFormScreen({ navigation, route }) {
  const productId = route.params?.productId;
  const editing = Boolean(productId);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(null);
  const [level, setLevel] = useState("Iniciante");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("3");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  const { errors, setErrors, field } = useFormErrors();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let active = true;

    async function load() {
      try {
        const product = await getProduct(productId);
        if (!active) return;
        setName(product.name);
        setBrand(product.brand);
        setCategory(product.category);
        setLevel(product.level);
        setPrice(formatMoneyInput(product.price));
        setMinStock(String(product.minStock));
        setDescription(product.description);
        setStatus(product.active ? "active" : "inactive");
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar a mercadoria."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [productId, editing]);

  async function handleSave() {
    setError("");
    setMessage("");
    const found = validateProduct({ name, brand, category, level, price, stock, minStock, description }, !editing);
    setErrors(found);
    if (hasErrors(found)) return;

    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      level,
      price: parseMoney(price),
      minStock: Number(minStock),
      description: description.trim(),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateProduct(productId, { ...payload, active: status === "active" });
        setMessage("Mercadoria atualizada com sucesso.");
        setSaving(false);
      } else {
        const created = await createProduct({ ...payload, stock: Number(stock) });
        navigation.replace("ProductDetail", { productId: created.id, created: true });
      }
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "Não foi possível salvar a mercadoria."));
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
      <Text style={styles.intro}>
        {editing
          ? "Altere os dados da mercadoria. Para mudar a quantidade, registre uma entrada de estoque na tela da mercadoria."
          : "Cadastre uma mercadoria nova. A quantidade inicial entra no estoque como uma movimentação de entrada."}
      </Text>

      <SectionTitle title="Identificação" />
      <FormField label="Nome da mercadoria" value={name} onChangeText={field("name", setName)} error={errors.name} placeholder="Ex.: Guitarra Stratocaster SSS" />
      <FormField label="Marca" value={brand} onChangeText={field("brand", setBrand)} error={errors.brand} placeholder="Ex.: Fender" />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((item) => (
          <Chip
            key={item.name}
            label={`${item.icon} ${item.name}`}
            accessibilityLabel={item.name}
            selected={category === item.name}
            onPress={() => field("category", setCategory)(item.name)}
          />
        ))}
      </View>
      {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}

      <Text style={[styles.label, styles.spaced]}>Nível</Text>
      <SegmentedControl options={LEVEL_OPTIONS} value={level} onChange={field("level", setLevel)} style={styles.segment} />
      {errors.level ? <Text style={styles.error}>{errors.level}</Text> : null}

      <SectionTitle title="Preço e estoque" style={styles.section} />
      <FormField
        label="Preço de venda (R$)"
        value={price}
        onChangeText={field("price", setPrice)}
        error={errors.price}
        placeholder="Ex.: 1.299,90"
        keyboardType="decimal-pad"
      />
      <View style={styles.row}>
        {!editing ? (
          <FormField
            label="Quantidade inicial"
            value={stock}
            onChangeText={field("stock", (text) => setStock(text.replace(/\D/g, "")))}
            error={errors.stock}
            placeholder="Ex.: 10"
            keyboardType="number-pad"
            containerStyle={styles.flex}
          />
        ) : null}
        <FormField
          label="Estoque mínimo"
          value={minStock}
          onChangeText={field("minStock", (text) => setMinStock(text.replace(/\D/g, "")))}
          error={errors.minStock}
          placeholder="Ex.: 3"
          keyboardType="number-pad"
          hint="Abaixo disso, o item aparece como estoque baixo."
          containerStyle={styles.flex}
        />
      </View>
      <FormField
        label="Descrição (opcional)"
        value={description}
        onChangeText={field("description", setDescription)}
        error={errors.description}
        placeholder="Principais características: madeira, captação, potência…"
        multiline
        maxLength={500}
        style={styles.description}
        hint="O assistente usa a descrição para comparar desempenho."
      />

      {editing ? (
        <>
          <Text style={styles.label}>Situação</Text>
          <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} style={styles.segment} />
        </>
      ) : null}

      <MessageBanner type="success" message={message} />
      <MessageBanner message={error || (hasErrors(errors) ? "Confira os campos destacados." : "")} />
      <AppButton title={editing ? "Salvar alterações" : "Cadastrar mercadoria"} onPress={handleSave} loading={saving} />
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  segment: {
    marginBottom: spacing.lg,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.danger,
  },
  section: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  description: {
    minHeight: 88,
    textAlignVertical: "top",
  },
});
