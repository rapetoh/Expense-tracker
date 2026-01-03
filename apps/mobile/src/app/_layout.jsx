import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { Roboto_400Regular } from "@expo-google-fonts/roboto";
import useDeviceId from "@/utils/useDeviceId";
import { initPurchases } from "@/utils/premium";
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const deviceId = useDeviceId();

  const [fontsLoaded, fontsError] = useFonts({
    Poppins_600SemiBold,
    Roboto_400Regular,
  });

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (deviceId) {
      initPurchases({ deviceId });
    }
  }, [deviceId]);

  useEffect(() => {
    if (isReady && (fontsLoaded || fontsError)) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontsError]);

  if (!isReady || (!fontsLoaded && !fontsError)) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
