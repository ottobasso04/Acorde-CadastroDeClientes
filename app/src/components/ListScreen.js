import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../styles/theme";

export default function ListScreen({ children, maxWidth = 760 }) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={[styles.content, { maxWidth }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
