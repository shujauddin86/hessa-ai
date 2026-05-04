import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../context/AuthContext";

import LoginScreen      from "../screens/LoginScreen";
import RegisterScreen   from "../screens/RegisterScreen";
import DashboardScreen  from "../screens/DashboardScreen";
import ProcessingScreen from "../screens/ProcessingScreen";
import PreviewScreen    from "../screens/PreviewScreen";
import PlansScreen      from "../screens/PlansScreen";

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle:      { backgroundColor: "#0a0a0f", elevation: 0, shadowOpacity: 0 },
  headerTintColor:  "#f4f4f5",
  headerTitleStyle: { fontWeight: "700" },
  cardStyle:        { backgroundColor: "#0a0a0f" },
};

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard"  component={DashboardScreen}  options={{ title: "Hessa AI" }} />
            <Stack.Screen name="Processing" component={ProcessingScreen} options={{ title: "Processing…" }} />
            <Stack.Screen name="Preview"    component={PreviewScreen}    options={{ title: "Select Clips" }} />
            <Stack.Screen name="Plans"      component={PlansScreen}      options={{ title: "Plans" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
