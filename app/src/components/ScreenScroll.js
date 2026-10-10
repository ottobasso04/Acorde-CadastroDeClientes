import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, contentMaxWidth, spacing, wideMaxWidth } from "../styles/theme";

export default function ScreenScroll({ children, hasHeader = true, wide = false }) {
  return (
    <SafeAreaView style={styles.safe} edges={hasHeader ? ["bottom", "left", "right"] : undefined}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.content, { maxWidth: wide ? wideMaxWidth : contentMaxWidth }]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  content: {
    width: "100%",
    alignSelf: "center",
  },
});
