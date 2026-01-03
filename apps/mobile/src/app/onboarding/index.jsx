import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Mic, Sparkles, ShieldCheck, Crown } from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { presentPremiumPaywall, usePremium } from "@/utils/premium";

const ONBOARDING_KEY = "expense_tracker_onboarding_done_v1";

export default function Onboarding() {
  const router = useRouter();
  const { isDark } = useTheme();

  const width = Dimensions.get("window").width;

  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.70)" : "#6B7280";

  const premium = usePremium();
  const isPremium = !!premium.isPremium;

  const pages = useMemo(
    () => [
      {
        key: "p1",
        icon: Mic,
        title: "Log expenses by voice",
        description:
          "Hold the mic, say it like a text, and we’ll turn it into a clean entry.",
      },
      {
        key: "p2",
        icon: Sparkles,
        title: "Smart categories",
        description:
          "Tag “Shell” once and we’ll remember it forever. Less tapping. More flow.",
      },
      {
        key: "p3",
        icon: Crown,
        title: "10 free voice entries / month",
        description:
          "Upgrade to Premium for unlimited AI voice logging and an ad-free feed.",
      },
      {
        key: "p4",
        icon: ShieldCheck,
        title: "Private by default",
        description:
          "This MVP stores data per device. Add accounts later for multi-device sync.",
      },
    ],
    [],
  );

  const goTo = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, next));
      setIndex(clamped);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          x: clamped * width,
          y: 0,
          animated: true,
        });
      }
    },
    [pages.length, width],
  );

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    } catch (e) {
      console.error(e);
    }

    router.replace("/(tabs)/home");
  }, [router]);

  const tryPremium = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }

    const res = await presentPremiumPaywall();
    if (res?.success) {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {
        // ignore
      }
    }
  }, []);

  const onNext = useCallback(async () => {
    if (index >= pages.length - 1) {
      await Haptics.selectionAsync();
      await finish();
      return;
    }
    await Haptics.selectionAsync();
    goTo(index + 1);
  }, [finish, goTo, index, pages.length]);

  const isLastPage = index >= pages.length - 1;
  const primaryButtonLabel = isLastPage ? "Start" : "Next";

  return (
    <ScreenLayout variant="onboarding">
      <View style={{ flex: 1 }}>
        {/* ScreenLayout already renders the background circles */}

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 28,
              color: textPrimary,
            }}
          >
            Welcome
          </Text>
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 14,
              marginTop: 4,
              color: textSecondary,
            }}
          >
            Zero-friction expense tracking.
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(evt) => {
            const x = evt.nativeEvent.contentOffset.x;
            const next = Math.round(x / width);
            setIndex(next);
          }}
          style={{ flexGrow: 0, marginTop: 20 }}
        >
          {pages.map((p) => {
            const Icon = p.icon;
            return (
              <View
                key={p.key}
                style={{
                  width,
                  paddingHorizontal: 20,
                }}
              >
                <View
                  style={{
                    borderRadius: 28,
                    padding: 18,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.65)",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 20,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.06)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={22} color={textPrimary} />
                  </View>

                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 20,
                      color: textPrimary,
                      marginTop: 14,
                    }}
                  >
                    {p.title}
                  </Text>

                  <Text
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 14,
                      color: textSecondary,
                      marginTop: 10,
                      lineHeight: 20,
                    }}
                  >
                    {p.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Dots */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            marginTop: 18,
          }}
        >
          {pages.map((p, i) => {
            const active = i === index;
            return (
              <View
                key={p.key}
                style={{
                  width: active ? 18 : 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: active
                    ? isDark
                      ? "#fff"
                      : "#000"
                    : isDark
                      ? "rgba(255,255,255,0.22)"
                      : "rgba(0,0,0,0.18)",
                }}
              />
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* Buttons */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          {!isPremium ? (
            <TouchableOpacity
              onPress={tryPremium}
              activeOpacity={0.9}
              style={{
                paddingVertical: 14,
                borderRadius: 18,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.06)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(0,0,0,0.06)",
              }}
              accessibilityLabel="Try Premium"
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color: textPrimary,
                }}
              >
                Try Premium
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={onNext}
            activeOpacity={0.9}
            style={{
              paddingVertical: 14,
              borderRadius: 18,
              backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
              alignItems: "center",
              justifyContent: "center",
              marginTop: !isPremium ? 10 : 0,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: isDark ? "#000" : "#fff",
              }}
            >
              {primaryButtonLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={finish}
            activeOpacity={0.8}
            style={{
              paddingVertical: 14,
              borderRadius: 18,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.65)",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.06)",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: textPrimary,
              }}
            >
              Skip
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 11,
              color: textSecondary,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Subscriptions auto-renew until cancelled.
          </Text>
        </View>
      </View>
    </ScreenLayout>
  );
}

export { ONBOARDING_KEY };
