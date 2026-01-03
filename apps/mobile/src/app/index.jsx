import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import ScreenLayout from "@/components/ScreenLayout";
import { useTheme } from "@/utils/theme";

const ONBOARDING_KEY = "expense_tracker_onboarding_done_v1";

export default function Index() {
  const { isDark } = useTheme();

  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

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
    return done ? "/(tabs)/home" : "/onboarding";
  }, [done]);

  if (!ready) {
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

  // Expo entrypoint: send users into onboarding once, then the tabbed app
  return <Redirect href={href} />;
}
