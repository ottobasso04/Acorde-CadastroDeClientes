import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/theme";

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

export default function BarChart({ data, series, height = 160, formatValue = String, labelEvery = 1 }) {
  const max = Math.max(1, ...data.flatMap((item) => series.map((serie) => item[serie.key] || 0)));

  return (
    <View>
      {series.length > 1 ? (
        <View style={styles.legend}>
          {series.map((serie) => (
            <View key={serie.key} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: serie.color }]} />
              <Text style={styles.legendText}>{serie.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.maxLabel}>máx. {formatValue(max)}</Text>
      <View style={[styles.chart, { height }]}>
        {data.map((item, index) => (
          <View key={item.label + index} style={styles.column}>
            <View style={styles.bars}>
              {series.map((serie) => {
                const value = item[serie.key] || 0;
                return (
                  <View
                    key={serie.key}
                    accessibilityLabel={`${item.label}: ${serie.label} ${formatValue(value)}`}
                    style={[
                      styles.bar,
                      {
                        height: Math.max(value > 0 ? 3 : 1, (value / max) * (height - 8)),
                        backgroundColor: value > 0 ? serie.color : colors.border,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        {chunk(data, labelEvery).map((group, index) => (
          <Text
            key={group[0].label + index}
            style={[styles.axisLabel, { flex: group.length }, labelEvery > 1 && styles.axisLabelLeft]}
            numberOfLines={1}
          >
            {group[0].label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 13,
    color: colors.muted,
  },
  maxLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  column: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },
  bar: {
    flex: 1,
    maxWidth: 28,
    borderTopLeftRadius: radius.sm / 2,
    borderTopRightRadius: radius.sm / 2,
  },
  axis: {
    flexDirection: "row",
    gap: 3,
    marginTop: spacing.xs,
  },
  axisLabel: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  axisLabelLeft: {
    textAlign: "left",
  },
});
