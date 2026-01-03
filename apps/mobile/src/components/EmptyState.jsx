import React from "react";
import { View, Text } from "react-native";
import { Inbox } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

export default function EmptyState({ title, description, icon: Icon = Inbox }) {
  const { isDark } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 32,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: isDark ? "#1E1E1E" : "#F6F6F6",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Icon size={28} color={isDark ? "#E5E5E5" : "#111"} />
      </View>
      <Text
        style={{
          fontFamily: "Poppins_600SemiBold",
          fontSize: 22,
          color: isDark ? "#fff" : "#000",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "Roboto_400Regular",
          fontSize: 14,
          color: isDark ? "rgba(255,255,255,0.7)" : "#6B7280",
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </View>
  );
}
