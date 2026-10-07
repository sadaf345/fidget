import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { SavedFidgetProvider } from "@/contexts/SavedFidgetContext";
import { theme } from "@/constants/colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  return (
    // Swipe-back is off everywhere: this app is all pressing and dragging, and an edge swipe
    // mid-fidget shouldn't yank you out. Every screen has a back button instead.
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pick" />
      <Stack.Screen name="pop" />
      <Stack.Screen name="charge" />
      <Stack.Screen name="spin" />
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
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SavedFidgetProvider>
        <RootLayoutNav />
      </SavedFidgetProvider>
    </View>
  );
}
