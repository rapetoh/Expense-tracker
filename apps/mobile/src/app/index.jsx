import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import ScreenLayout from "@/components/ScreenLayout";
import { useTheme } from "@/utils/theme";
import { useAuth } from "@/utils/auth/useAuth";
import { useRequireAuth } from "@/utils/auth/useAuth";

const ONBOARDING_KEY = "expense_tracker_onboarding_done_v1";

export default function Index() {
  const { isDark } = useTheme();
  const { isAuthenticated, isReady: authReady } = useAuth();
  
  // Require authentication - opens modal if not authenticated
  useRequireAuth({ mode: 'signin' });

  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [forceAuthReady, setForceAuthReady] = useState(false);

  // Timeout to force proceed even if authReady is false
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceAuthReady(true);
    }, 3000); // 3 second timeout
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        const isDone = value === "1";
        if (mounted) {
          setDone(isDone);
          setReady(true);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setDone(false);
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.70)" : "#4B5563";

  const href = useMemo(() => {
    // Don't navigate if auth isn't ready or user isn't authenticated
    if (!authReady || !isAuthenticated) {
      return null;
    }
    return done ? "/(tabs)/home" : "/onboarding";
  }, [done, isAuthenticated, authReady]);

  if ((!ready || !authReady) && !forceAuthReady) {
    // Custom in-app splash while we decide where to route.
    return (
      <ScreenLayout variant="splash">
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 34,
              color: textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Spend
          </Text>
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 14,
              color: textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Voice-first expense tracking
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  // Don't redirect if user is not authenticated (auth modal will show via useRequireAuth)
  if (!isAuthenticated || !href) {
    return (
      <ScreenLayout variant="splash">
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 34,
              color: textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Spend
          </Text>
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 14,
              color: textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Voice-first expense tracking
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  // Expo entrypoint: send users into onboarding once, then the tabbed app
  return <Redirect href={href} />;
}
