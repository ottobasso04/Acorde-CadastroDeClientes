import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";
import { colors } from "../styles/theme";
import AdminNavigator from "./AdminNavigator";
import AuthNavigator from "./AuthNavigator";
import CustomerNavigator from "./CustomerNavigator";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
  },
};

export default function RootNavigator() {
  const { token, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {!token ? (
        <AuthNavigator />
      ) : isAdmin ? (
        <AdminNavigator />
      ) : (
        <CartProvider>
          <CustomerNavigator />
        </CartProvider>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
