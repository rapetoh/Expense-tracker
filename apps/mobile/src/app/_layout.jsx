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

  // Guaranteed timeout to force splash screen hide
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    // Independent timeout - force hide splash after 2 seconds, no conditions
    const timeout = setTimeout(() => {
      setForceReady(true);
      // Force hide splash screen immediately when timeout fires
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors - splash might already be hidden
      });
    }, 2000); // 2 second timeout for faster UX
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    initiate();
  }, [initiate]);

  // Hide splash as soon as everything is ready (optimistic - don't wait for timeout)
  useEffect(() => {
    if (isReady && (fontsLoaded || fontsError)) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors - might already be hidden
      });
    }
  }, [isReady, fontsLoaded, fontsError]);

  // RevenueCat - completely non-blocking, deferred to next tick
  useEffect(() => {
    // Defer to next tick - don't block render
    const timeout = setTimeout(() => {
      const userId = auth?.user?.id;
      const idToUse = userId || deviceId;
      
      if (idToUse) {
        initPurchases({ deviceId: idToUse, userId: userId || undefined }).catch(() => {
          // Silent fail - don't log, don't block
        });
      }
    }, 100); // Defer by 100ms to ensure render happens first
    
    return () => clearTimeout(timeout);
  }, [deviceId, auth?.user?.id]);

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
