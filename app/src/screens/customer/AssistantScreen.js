import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AiBadge from "../../components/AiBadge";
import AppButton from "../../components/AppButton";
import FormField from "../../components/FormField";
import InterestPicker from "../../components/InterestPicker";
import MessageBanner from "../../components/MessageBanner";
import RecommendationCard from "../../components/RecommendationCard";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import { useCart } from "../../contexts/CartContext";
import { getErrorMessage, getFieldErrors } from "../../services/api";
import { askRecommendations, getProfile } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";
import { formatMoney } from "../../utils/format";
import { parseMoney } from "../../utils/validators";

const MAX_CATEGORIES = 5;

export default function AssistantScreen() {
  const cart = useCart();

  const [categories, setCategories] = useState([]);
  const [budget, setBudget] = useState("");
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    getProfile()
      .then((profile) => {
        if (active) setCategories(profile.interests.slice(0, MAX_CATEGORIES));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleAsk() {
    setError("");
    const found = {};
    const budgetValue = budget.trim() ? parseMoney(budget) : null;
    if (budget.trim() && (!Number.isFinite(budgetValue) || budgetValue <= 0)) found.budget = "Informe um valor como 2.000,00.";
    if (categories.length === 0) found.interests = "Escolha pelo menos uma categoria.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const data = await askRecommendations({
        categories,
        budget: budgetValue ?? undefined,
        query: query.trim(),
      });
      setResult(data);
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, "O assistente não conseguiu responder agora."));
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(product) {
    const added = cart.add(product);
    setNotice(added ? `${product.name} foi para o carrinho.` : "Quantidade máxima deste produto já está no carrinho.");
  }

  return (
    <ScreenScroll>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>✨ Assistente de compras</Text>
        <Text style={styles.introText}>
          Escolha as categorias e conte o que você procura. O Gemini compara preço e desempenho dos produtos em estoque e
          indica o melhor preço, o melhor desempenho e o melhor custo-benefício.
        </Text>
      </View>

      <InterestPicker
        label="Categorias da busca"
        hint={`Até ${MAX_CATEGORIES}. Já marcamos os seus interesses.`}
        value={categories}
        onChange={setCategories}
        error={errors.interests || errors.categories}
        max={MAX_CATEGORIES}
      />
      <FormField
        label="Orçamento máximo (opcional)"
        value={budget}
        onChangeText={setBudget}
        error={errors.budget}
        placeholder="Ex.: 2.000,00"
        keyboardType="decimal-pad"
      />
      <FormField
        label="O que você procura? (opcional)"
        value={query}
        onChangeText={setQuery}
        error={errors.query}
        placeholder="Ex.: guitarra para tocar rock em casa, com bom som para quem está começando"
        multiline
        maxLength={200}
        style={styles.query}
      />

      <MessageBanner message={error} />
      <AppButton title={loading ? "Consultando o assistente…" : "Buscar recomendações"} onPress={handleAsk} loading={loading} />

      {result ? (
        <View style={styles.results}>
          <SectionTitle
            title="Recomendações"
            subtitle={`${result.categories.join(", ")}${result.budget ? ` · até ${formatMoney(result.budget)}` : ""}`}
          />
          <AiBadge result={result} />
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{result.resumo}</Text>
          </View>
          <MessageBanner type="success" message={notice} />
          {result.recomendacoes.map((item) => (
            <RecommendationCard
              key={`${item.tipo}-${item.product.id}`}
              item={item}
              inCart={cart.quantityOf(item.product.id)}
              onAdd={handleAdd}
            />
          ))}
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  intro: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
  },
  introText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.border,
  },
  query: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  results: {
    marginTop: spacing.xxl,
  },
  summary: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
});
