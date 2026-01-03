import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { formatMoney } from "@/utils/api";
import { useTheme } from "@/utils/theme";

export default function WeeklyBudgetBar({
  spentCents = 0,
  budgetCents = 0,
  incomeCents = 0,
  netBalanceCents = 0,
  currency = "USD",
  period = "Weekly", // "Weekly" or "Monthly"
}) {
  const { isDark } = useTheme();

  const safeBudget = Number.isFinite(budgetCents) ? budgetCents : 0;
  const safeSpent = Number.isFinite(spentCents) ? spentCents : 0;
  const safeIncome = Number.isFinite(incomeCents) ? incomeCents : 0;
  const safeNetBalance = Number.isFinite(netBalanceCents) ? netBalanceCents : 0;

  const remaining = useMemo(() => {
    return Math.max(safeBudget - safeSpent, 0);
  }, [safeBudget, safeSpent]);

  const ratio = useMemo(() => {
    if (safeBudget <= 0) return 0;
    return Math.min(safeSpent / safeBudget, 1);
  }, [safeSpent, safeBudget]);

  const remainingText = useMemo(() => {
    if (safeBudget <= 0) return `Set your ${period.toLowerCase()} budget`;
    const periodText = period === "Monthly" ? "this month" : "this week";
    return `${formatMoney(remaining, currency)} left ${periodText}`;
  }, [remaining, currency, safeBudget, period]);

  const subText = useMemo(() => {
    if (safeBudget <= 0) return "Tap Profile → Budget to get started";
    return `${formatMoney(safeSpent, currency)} spent of ${formatMoney(safeBudget, currency)}`;
  }, [safeBudget, safeSpent, currency]);

  const fillWidth = `${Math.round(ratio * 100)}%`;

  return (
    <View
      style={{
        borderRadius: 20,
        padding: 16,
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "#FFFFFF",
        borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 18,
            color: isDark ? "#fff" : "#1A1A1A",
          }}
        >
          {period} Overview
        </Text>
        {safeIncome > 0 && (
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 12,
              color: isDark ? "rgba(255,255,255,0.6)" : "#4B5563",
            }}
          >
            Income: {formatMoney(safeIncome, currency)}
          </Text>
        )}
      </View>

      {safeNetBalance !== 0 && (
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 16,
            color: safeNetBalance >= 0 
              ? (isDark ? "#4ADE80" : "#10B981") 
              : (isDark ? "#F87171" : "#EF4444"),
            marginBottom: 8,
          }}
        >
          {safeNetBalance >= 0 ? "+" : ""}{formatMoney(safeNetBalance, currency)} net
        </Text>
      )}

      <Text
        style={{
          fontFamily: "Roboto_400Regular",
          fontSize: 14,
          color: isDark ? "rgba(255,255,255,0.75)" : "#4B5563",
          marginBottom: 12,
        }}
      >
        {remainingText}
      </Text>

      <View
        style={{
          height: 12,
          width: "100%",
          borderRadius: 999,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <View style={{ width: fillWidth, height: 12 }}>
          <LinearGradient
            colors={["#BFD4FF", "#CBFACF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
      </View>

      <Text
        style={{
          marginTop: 10,
          fontFamily: "Roboto_400Regular",
          fontSize: 12,
          color: isDark ? "rgba(255,255,255,0.6)" : "#4B5563",
        }}
      >
        {subText}
      </Text>
    </View>
  );
}
