import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { FidgetProvider } from "@/contexts/FidgetContext";
import { SavedFidgetProvider } from "@/contexts/SavedFidgetContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="playground" />
      <Stack.Screen name="create" />
      <Stack.Screen name="my-widgets" />
      <Stack.Screen name="fidget/[id]" />
      <Stack.Screen name="haptics" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
        <SavedFidgetProvider>
          <FidgetProvider>
            <RootLayoutNav />
          </FidgetProvider>
        </SavedFidgetProvider>
      </View>
    </QueryClientProvider>
  );
}
