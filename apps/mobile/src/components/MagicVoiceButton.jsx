import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Mic } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

export default function MagicVoiceButton({
  onLongPress,
  onPressOut,
  isActive,
  disabled,
}) {
  const { isDark } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      Animated.timing(glow, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.timing(glow, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [isActive, scale, glow]);

  const iconColor = useMemo(() => {
    if (disabled) return isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
    return isDark ? "#fff" : "#000";
  }, [disabled, isDark]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <View
          style={{
            borderRadius: 39,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)",
          }}
        >
          <BlurView
            intensity={disabled ? 20 : 32}
            tint={isDark ? "dark" : "light"}
            style={{
              width: 78,
              height: 78,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pressable
              onLongPress={disabled ? undefined : onLongPress}
              onPressOut={disabled ? undefined : onPressOut}
              delayLongPress={180}
              style={({ pressed }) => ({
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Mic size={28} color={iconColor} />
            </Pressable>
          </BlurView>
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: isDark ? "#BFD4FF" : "#CBFACF",
          opacity: glow.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.22],
          }),
        }}
      />

      <Text
        style={{
          marginTop: 10,
          fontFamily: "Roboto_400Regular",
          fontSize: 12,
          color: isDark ? "rgba(255,255,255,0.65)" : "#6B7280",
        }}
      >
        Hold to talk
      </Text>
    </View>
  );
}
