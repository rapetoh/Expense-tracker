import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { Roboto_400Regular } from "@expo-google-fonts/roboto";
import useDeviceId from "@/utils/useDeviceId";
import { initPurchases } from "@/utils/premium";
import { AuthModal } from "@/utils/auth/useAuthModal";
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
  const { initiate, isReady, auth } = useAuth();
  const deviceId = useDeviceId();

  const [fontsLoaded, fontsError] = useFonts({
    Poppins_600SemiBold,
    Roboto_400Regular,
  });

  // Add timeout to prevent infinite hang
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceReady(true);
    }, 5000); // 5 second timeout
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    // Initialize RevenueCat with user_id if authenticated, otherwise device_id
    const userId = auth?.user?.id;
    const idToUse = userId || deviceId;
    
    if (idToUse) {
      initPurchases({ deviceId: idToUse, userId: userId || undefined });
    }
  }, [deviceId, auth?.user?.id]);

  useEffect(() => {
    if ((isReady && (fontsLoaded || fontsError)) || forceReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontsError, forceReady]);

  if ((!isReady || (!fontsLoaded && !fontsError)) && !forceReady) {
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
        <AuthModal />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
