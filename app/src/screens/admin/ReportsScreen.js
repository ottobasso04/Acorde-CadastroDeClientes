import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import AiBadge from "../../components/AiBadge";
import AppButton from "../../components/AppButton";
import BarChart from "../../components/BarChart";
import MessageBanner from "../../components/MessageBanner";
import ScreenScroll from "../../components/ScreenScroll";
import SectionTitle from "../../components/SectionTitle";
import SegmentedControl from "../../components/SegmentedControl";
import StatTile from "../../components/StatTile";
import { getErrorMessage } from "../../services/api";
import { askAdminReport, getDashboard } from "../../services/storeApi";
import { colors, radius, spacing } from "../../styles/theme";
import { formatCompactMoney, formatDay, formatMoney } from "../../utils/format";

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
];

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function AnalysisList({ title, icon, items, color }) {
  if (!items?.length) return null;
  return (
    <View style={styles.analysisBlock}>
      <Text style={[styles.analysisTitle, { color }]}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.analysisItem}>
          <Text style={[styles.analysisIcon, { color }]}>{icon}</Text>
          <Text style={styles.analysisText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    setLoading(true);

    async function load() {
      try {
        const dashboard = await getDashboard(days);
        if (!active) return;
        setData(dashboard);
        setError("");
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError, "Não foi possível carregar os relatórios."));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isFocused, days]);

  function changePeriod(value) {
    setDays(value);
    setAnalysis(null);
    setAnalysisError("");
  }

  async function handleAnalyze() {
    setAnalysisError("");
    setAnalyzing(true);
    try {
      setAnalysis(await askAdminReport(days));
    } catch (requestError) {
      setAnalysisError(getErrorMessage(requestError, "Não foi possível gerar a análise."));
    } finally {
      setAnalyzing(false);
    }
  }

  const totals = data?.totais;
  const labelEvery = days === 7 ? 1 : days === 15 ? 2 : 5;
  const topQuantity = Math.max(1, ...(data?.maisVendidos ?? []).map((item) => item.quantidade));

  return (
    <ScreenScroll wide>
      <SegmentedControl options={PERIODS} value={days} onChange={changePeriod} style={styles.period} />
      <MessageBanner message={error} />

      {loading && !data ? <ActivityIndicator size="large" color={colors.primary} style={styles.loading} /> : null}

      {data ? (
        <>
          <View style={styles.tiles}>
            <StatTile tone="dark" label="Faturamento" value={formatCompactMoney(totals.faturamento)} detail={formatMoney(totals.faturamento)} />
            <StatTile label="Pedidos" value={String(totals.pedidos)} detail={`ticket médio ${formatMoney(totals.ticketMedio)}`} />
            <StatTile label="Itens vendidos" value={String(totals.itensVendidos)} />
            <StatTile label="Entradas no estoque" value={`+${totals.entradas}`} detail="unidades" />
            <StatTile label="Saídas do estoque" value={`−${totals.saidas}`} detail="unidades" />
          </View>

          <Card>
            <SectionTitle title="Vendas por dia" subtitle="Faturamento diário no período." />
            <BarChart
              data={data.vendasPorDia.map((day) => ({ label: formatDay(day.dia), faturamento: day.faturamento }))}
              series={[{ key: "faturamento", label: "Faturamento", color: colors.primary }]}
              formatValue={formatCompactMoney}
              labelEvery={labelEvery}
            />
            <Text style={styles.chartNote}>
              Melhor dia:{" "}
              {(() => {
                const best = data.vendasPorDia.reduce((a, b) => (b.faturamento > a.faturamento ? b : a));
                return best.faturamento > 0 ? `${formatDay(best.dia)} (${best.pedidos} pedidos, ${formatMoney(best.faturamento)})` : "sem vendas";
              })()}
            </Text>
          </Card>

          <Card>
            <SectionTitle title="Entrada e saída de estoque" subtitle="Unidades que entraram (reposição) e saíram (vendas) por dia." />
            <BarChart
              data={data.movimentacaoPorDia.map((day) => ({ label: formatDay(day.dia), entradas: day.entradas, saidas: day.saidas }))}
              series={[
                { key: "entradas", label: "Entradas", color: colors.success },
                { key: "saidas", label: "Saídas", color: colors.accent },
              ]}
              labelEvery={labelEvery}
            />
          </Card>

          <Card>
            <SectionTitle title="Itens mais vendidos" subtitle="Ranking por unidades vendidas no período." />
            {data.maisVendidos.length === 0 ? <Text style={styles.empty}>Nenhuma venda no período.</Text> : null}
            {data.maisVendidos.map((item, index) => (
              <Pressable
                key={item.productId}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${item.nome}`}
                onPress={() => navigation.navigate("ProductDetail", { productId: item.productId })}
                style={styles.rankRow}
              >
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.flex}>
                  <Text style={styles.rankName}>{item.nome}</Text>
                  <View style={styles.rankBarTrack}>
                    <View style={[styles.rankBar, { width: `${(item.quantidade / topQuantity) * 100}%` }]} />
                  </View>
                  <Text style={styles.rankMeta}>
                    {item.categoria} · estoque atual {item.estoqueAtual}
                  </Text>
                </View>
                <View style={styles.rankNumbers}>
                  <Text style={styles.rankQty}>{item.quantidade} un.</Text>
                  <Text style={styles.rankRevenue}>{formatMoney(item.faturamento)}</Text>
                </View>
              </Pressable>
            ))}
          </Card>

          <Card>
            <SectionTitle title="Vendas por categoria" />
            {data.porCategoria.map((item) => (
              <View key={item.categoria} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{item.categoria}</Text>
                <Text style={styles.categoryValue}>
                  {item.itens} un. · {formatMoney(item.faturamento)}
                </Text>
              </View>
            ))}
          </Card>

          <Card>
            <SectionTitle title="Estoque baixo" subtitle="Itens no estoque mínimo ou abaixo dele." />
            {data.estoqueBaixo.length === 0 ? <Text style={styles.empty}>Nenhum item com estoque baixo.</Text> : null}
            {data.estoqueBaixo.map((item) => (
              <Pressable
                key={item.productId}
                accessibilityRole="button"
                accessibilityLabel={`Repor ${item.nome}`}
                onPress={() => navigation.navigate("ProductDetail", { productId: item.productId })}
                style={styles.lowRow}
              >
                <Text style={styles.lowName}>{item.nome}</Text>
                <Text style={[styles.lowValue, item.estoque === 0 && styles.lowZero]}>
                  {item.estoque === 0 ? "esgotado" : `${item.estoque} / mín. ${item.estoqueMinimo}`}
                </Text>
              </Pressable>
            ))}
          </Card>

          <View style={styles.ai}>
            <Text style={styles.aiTitle}>✨ Análise com IA</Text>
            <Text style={styles.aiText}>
              O Gemini lê os números do período (vendas, entradas e saídas, mais vendidos e estoque baixo) e escreve um
              resumo com destaques, alertas e recomendações.
            </Text>
            <AppButton
              title={analyzing ? "Analisando…" : analysis ? "Gerar novamente" : "Gerar análise com o Gemini"}
              onPress={handleAnalyze}
              loading={analyzing}
              style={styles.aiButton}
            />
          </View>
          <MessageBanner message={analysisError} />

          {analysis ? (
            <Card>
              <AiBadge result={analysis} />
              <Text style={styles.analysisSummary}>{analysis.analise.resumo}</Text>
              <AnalysisList title="Destaques" icon="✓" items={analysis.analise.destaques} color={colors.success} />
              <AnalysisList title="Alertas" icon="!" items={analysis.analise.alertas} color={colors.danger} />
              <AnalysisList title="Recomendações" icon="→" items={analysis.analise.recomendacoes} color={colors.info} />
            </Card>
          ) : null}
        </>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  period: {
    marginBottom: spacing.lg,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartNote: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.muted,
  },
  empty: {
    fontSize: 14,
    color: colors.muted,
  },
  flex: {
    flex: 1,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    textAlign: "center",
    lineHeight: 28,
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  rankName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  rankBarTrack: {
    height: 6,
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  rankBar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  rankMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.muted,
  },
  rankNumbers: {
    alignItems: "flex-end",
  },
  rankQty: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  rankRevenue: {
    fontSize: 12,
    color: colors.muted,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryName: {
    fontSize: 14,
    color: colors.ink,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  lowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lowName: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  lowValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  lowZero: {
    color: colors.danger,
  },
  ai: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
  },
  aiText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.border,
  },
  aiButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
  },
  analysisSummary: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  analysisBlock: {
    marginTop: spacing.md,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  analysisItem: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  analysisIcon: {
    width: 16,
    fontSize: 15,
    fontWeight: "800",
  },
  analysisText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
});
