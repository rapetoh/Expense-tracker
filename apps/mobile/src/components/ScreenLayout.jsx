import React from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackgroundCircles from "./BackgroundCircles";
import { useTheme } from "@/utils/theme";

export default function ScreenLayout({
  children,
  variant = "home",
  showBackground = true,
  style,
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const backgroundColor = isDark ? "#121212" : "#FAFAFA";

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor,
          paddingTop: insets.top,
        },
        style,
      ]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {showBackground ? <BackgroundCircles variant={variant} /> : null}
      {children}
    </View>
  );
}
