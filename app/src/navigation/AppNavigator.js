import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ClientFormScreen from "../screens/ClientFormScreen";
import ClientsListScreen from "../screens/ClientsListScreen";
import HomeScreen from "../screens/HomeScreen";
import { colors } from "../styles/theme";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Acorde" }} />
      <Stack.Screen name="Clients" component={ClientsListScreen} options={{ title: "Clientes" }} />
      <Stack.Screen
        name="ClientForm"
        component={ClientFormScreen}
        options={({ route }) => ({
          title: route.params?.clientId ? "Editar cliente" : "Novo cliente",
        })}
      />
    </Stack.Navigator>
  );
}
