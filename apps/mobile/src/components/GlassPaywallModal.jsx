import React, { useCallback } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Crown, X } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

export default function GlassPaywallModal({
  visible,
  title = "Premium",
  subtitle = "Unlimited voice entries + no partner cards",
  onClose,
  onContinue,
}) {
  const { isDark } = useTheme();

  const textPrimary = isDark ? "#fff" : "#000";
  const textSecondary = isDark ? "rgba(255,255,255,0.70)" : "#6B7280";

  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const handleContinue = useCallback(() => {
    if (onContinue) onContinue();
  }, [onContinue]);

  return (
    <Modal
      visible={!!visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
          padding: 20,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            borderRadius: 28,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)",
          }}
        >
          <BlurView
            intensity={32}
            tint={isDark ? "dark" : "light"}
            style={{ padding: 18 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 18,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Crown size={20} color={textPrimary} />
              </View>

              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.8}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                }}
                accessibilityLabel="Close paywall"
              >
                <X size={18} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 22,
                color: textPrimary,
                marginTop: 14,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 14,
                color: textSecondary,
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              {subtitle}
            </Text>

            <View style={{ marginTop: 16 }}>
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 13,
                    color: textSecondary,
                  }}
                >
                  • Unlimited AI voice entries
                </Text>
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 13,
                    color: textSecondary,
                    marginTop: 6,
                  }}
                >
                  • Remove partner cards from your feed
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.9}
                style={{
                  paddingVertical: 14,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#FFFFFF" : "#000",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel="Continue to subscribe"
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 14,
                    color: isDark ? "#000" : "#fff",
                  }}
                >
                  Continue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.8}
                style={{
                  marginTop: 10,
                  paddingVertical: 14,
                  borderRadius: 18,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.70)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.06)",
                }}
                accessibilityLabel="Not now"
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 14,
                    color: textPrimary,
                  }}
                >
                  Not now
                </Text>
              </TouchableOpacity>

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 11,
                  color: textSecondary,
                  marginTop: 12,
                }}
              >
                Subscriptions auto-renew until cancelled.
              </Text>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}
