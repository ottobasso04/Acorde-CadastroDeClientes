import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text } from "react-native";

import { useCart } from "../contexts/CartContext";
import AssistantScreen from "../screens/customer/AssistantScreen";
import CartScreen from "../screens/customer/CartScreen";
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";
import OrdersScreen from "../screens/customer/OrdersScreen";
import ProfileScreen from "../screens/customer/ProfileScreen";
import ShopScreen from "../screens/customer/ShopScreen";
import { colors, radius, spacing } from "../styles/theme";
import { headerOptions } from "./headerOptions";

const Stack = createNativeStackNavigator();

function CartButton({ onPress }) {
  const { count } = useCart();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Carrinho com ${count} itens`} onPress={onPress} style={styles.cart}>
      <Text style={styles.cartText}>🛒 {count}</Text>
    </Pressable>
  );
}

const withCart = (title) => ({ navigation }) => ({
  title,
  headerRight: () => <CartButton onPress={() => navigation.navigate("Cart")} />,
});

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} options={withCart("Acorde")} />
      <Stack.Screen name="Shop" component={ShopScreen} options={withCart("Loja")} />
      <Stack.Screen name="Assistant" component={AssistantScreen} options={withCart("Assistente de compras")} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Carrinho" }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: "Meus pedidos" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Meu cadastro" }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  cart: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  cartText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },
});
