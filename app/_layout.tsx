import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { AppState, View } from "react-native";
import { SavedFidgetProvider } from "@/contexts/SavedFidgetContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { theme } from "@/constants/colors";
import { CoreHapticsBridge } from "@/lib/coreHaptics";
import { stopAllHaptics } from "@/lib/hapticState";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  return (
    // Swipe-back is off everywhere: this app is all pressing and dragging, and an edge swipe
    // mid-fidget shouldn't yank you out. Every screen has a back button instead.
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="haptics" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // No vibration may outlive the app being on screen.
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') stopAllHaptics();
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <CoreHapticsBridge />
      <SettingsProvider>
        <SavedFidgetProvider>
          <RootLayoutNav />
        </SavedFidgetProvider>
      </SettingsProvider>
    </View>
  );
}
