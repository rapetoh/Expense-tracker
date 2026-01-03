import React from "react";
import { View } from "react-native";
import { useTheme } from "@/utils/theme";

export default function BackgroundCircles({ variant = "home" }) {
  const { isDark } = useTheme();

  const palettes = {
    home: {
      a: isDark ? "#1A3A8A" : "#BFD4FF",
      b: isDark ? "#1A4D2E" : "#CBFACF",
    },
    analytics: {
      a: isDark ? "#3A2A4A" : "#D8CCFF",
      b: isDark ? "#4A4A2E" : "#FEF0B8",
    },
    profile: {
      a: isDark ? "#4A2A4A" : "#FFB8F3",
      b: isDark ? "#4A2C2A" : "#FFDCD5",
    },
    grid: {
      a: isDark ? "#2A4A4A" : "#BCF3EF",
      b: isDark ? "#1A3A8A" : "#BFD4FF",
    },
  };

  const p = palettes[variant] || palettes.home;

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -90,
          right: -90,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: p.a,
          opacity: isDark ? 0.32 : 0.28,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -120,
          left: -120,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: p.b,
          opacity: isDark ? 0.32 : 0.28,
        }}
      />
    </>
  );
}
