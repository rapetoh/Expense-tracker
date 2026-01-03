import React, { useMemo, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Linking from "expo-linking";
import { ArrowUpRight } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

const DEFAULT_PARTNERS = [
  {
    id: "partner_sofi",
    title: "SoFi",
    subtitle: "High-yield savings and budgeting tools",
    cta: "Learn more",
    accent: "#3B82F6",
    url: "https://www.sofi.com/",
  },
  {
    id: "partner_chase",
    title: "Chase Freedom",
    subtitle: "Cashback on everyday spend",
    cta: "See offer",
    accent: "#111827",
    url: "https://creditcards.chase.com/cash-back-credit-cards/freedom",
  },
  {
    id: "partner_robinhood",
    title: "Investing 101",
    subtitle: "Start small. Build habits.",
    cta: "Get started",
    accent: "#10B981",
    url: "https://robinhood.com/",
  },
];

export default function PartnerCard({ index = 0, partner }) {
  const { isDark } = useTheme();

  const chosen = useMemo(() => {
    if (partner) return partner;
    const safeIndex = Math.abs(index) % DEFAULT_PARTNERS.length;
    return DEFAULT_PARTNERS[safeIndex];
  }, [index, partner]);

  const textPrimary = isDark ? "#fff" : "#000";
  const textSecondary = isDark ? "rgba(255,255,255,0.72)" : "#6B7280";

  const onPress = useCallback(async () => {
    try {
      const url = chosen?.url;
      if (!url) return;

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          "Could not open link",
          "This link isn’t supported on your device.",
        );
        return;
      }

      await Linking.openURL(url);
    } catch (e) {
      console.error(e);
      Alert.alert("Could not open link", "Please try again.");
    }
  }, [chosen?.url]);

  // Glass card + subtle border
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
        marginBottom: 12,
      }}
      accessibilityLabel="Partner card"
    >
      <BlurView
        intensity={28}
        tint={isDark ? "dark" : "light"}
        style={{ padding: 16 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: chosen.accent,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color: textPrimary,
                }}
              >
                {chosen.title}
              </Text>
              <View
                style={{
                  marginLeft: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 11,
                    color: textSecondary,
                  }}
                >
                  Partner
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 13,
                color: textSecondary,
                marginTop: 8,
              }}
            >
              {chosen.subtitle}
            </Text>
          </View>

          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowUpRight size={18} color={textPrimary} />
          </View>
        </View>

        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 13,
            color: textPrimary,
            marginTop: 12,
          }}
        >
          {chosen.cta}
        </Text>

        <Text
          style={{
            fontFamily: "Roboto_400Regular",
            fontSize: 11,
            color: textSecondary,
            marginTop: 8,
          }}
        >
          Sponsored
        </Text>
      </BlurView>
    </TouchableOpacity>
  );
}
