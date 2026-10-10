import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminHomeScreen from "../screens/admin/AdminHomeScreen";
import ClientFormScreen from "../screens/admin/ClientFormScreen";
import ClientsListScreen from "../screens/admin/ClientsListScreen";
import ProductDetailScreen from "../screens/admin/ProductDetailScreen";
import ProductFormScreen from "../screens/admin/ProductFormScreen";
import ReportsScreen from "../screens/admin/ReportsScreen";
import StockScreen from "../screens/admin/StockScreen";
import { headerOptions } from "./headerOptions";

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: "Acorde · Administração" }} />
      <Stack.Screen name="Clients" component={ClientsListScreen} options={{ title: "Clientes" }} />
      <Stack.Screen
        name="ClientForm"
        component={ClientFormScreen}
        options={({ route }) => ({ title: route.params?.clientId ? "Editar cliente" : "Novo cliente" })}
      />
      <Stack.Screen name="Stock" component={StockScreen} options={{ title: "Estoque e mercadorias" }} />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={({ route }) => ({ title: route.params?.productId ? "Editar mercadoria" : "Nova mercadoria" })}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "Mercadoria" }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Relatórios e IA" }} />
    </Stack.Navigator>
  );
}
