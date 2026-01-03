import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Shield,
  Sparkles,
  Wallet,
  Moon,
  Sun,
  Smartphone,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import useDeviceId from "@/utils/useDeviceId";
import { formatMoney, toCentsFromLooseNumber } from "@/utils/api";
import { useDeviceSettings, useUpdateWeeklyBudget } from "@/utils/queries";
import { presentPremiumPaywall, usePremium } from "@/utils/premium";
import { useTheme, THEME_OPTIONS } from "@/utils/theme";

const Row = React.memo(({ icon: Icon, title, description, children, cardBg, isDark, textPrimary, textSecondary }) => (
  <View
    style={{
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
      marginBottom: 12,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: isDark ? "#1E1E1E" : "#F6F6F6",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Icon size={20} color={textPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 16,
            color: textPrimary,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "Roboto_400Regular",
            fontSize: 13,
            color: textSecondary,
            marginTop: 4,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
    {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
  </View>
));

export default function Profile() {
  const { themePreference, setThemePreference, isDark } = useTheme();
  const deviceId = useDeviceId();
  const premium = usePremium();

  const settingsQuery = useDeviceSettings({ deviceId });
  const updateBudget = useUpdateWeeklyBudget({ deviceId });

  const currency = settingsQuery.data?.currency_code || "USD";
  const weeklyBudgetCents = settingsQuery.data?.weekly_budget_cents || 0;
  const monthlyBudgetCents = settingsQuery.data?.monthly_budget_cents || 0;
  const budgetPeriod = settingsQuery.data?.budget_period || "weekly";

  const [budgetDraft, setBudgetDraft] = useState("");
  const [selectedBudgetPeriod, setSelectedBudgetPeriod] = useState(budgetPeriod);

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";

  // Update selected period when settings load
  useEffect(() => {
    setSelectedBudgetPeriod(budgetPeriod);
  }, [budgetPeriod]);

  const currentBudgetCents = useMemo(() => {
    return selectedBudgetPeriod === "monthly" ? monthlyBudgetCents : weeklyBudgetCents;
  }, [selectedBudgetPeriod, weeklyBudgetCents, monthlyBudgetCents]);

  const budgetPlaceholder = useMemo(() => {
    return formatMoney(currentBudgetCents, currency);
  }, [currentBudgetCents, currency]);

  const budgetDescription = useMemo(() => 
    `Current ${selectedBudgetPeriod === "monthly" ? "monthly" : "weekly"}: ${budgetPlaceholder}`,
    [selectedBudgetPeriod, budgetPlaceholder]
  );

  const budgetInputStyle = useMemo(() => ({
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: isDark
      ? "rgba(255,255,255,0.06)"
      : "#F9FAFB",
    borderWidth: 1,
    borderColor: isDark
      ? "rgba(255,255,255,0.10)"
      : "rgba(0,0,0,0.12)",
  }), [textPrimary, isDark]);

  const saveBudget = useCallback(async () => {
    try {
      const cents = toCentsFromLooseNumber(budgetDraft);
      const updateBody = {};
      
      if (selectedBudgetPeriod === "monthly") {
        updateBody.monthly_budget_cents = cents;
      } else {
        updateBody.weekly_budget_cents = cents;
      }
      updateBody.budget_period = selectedBudgetPeriod;
      
      await updateBudget.mutateAsync(updateBody);
      setBudgetDraft("");
      Alert.alert("Saved", `${selectedBudgetPeriod === "monthly" ? "Monthly" : "Weekly"} budget updated.`);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update your budget.");
    }
  }, [budgetDraft, updateBudget, selectedBudgetPeriod]);

  const openPremium = useCallback(async () => {
    const res = await presentPremiumPaywall();
    if (res?.success) {
      Alert.alert("Premium enabled", "Unlimited voice and no partner cards.");
      return;
    }

    // If user cancels, do nothing.
  }, []);

  const themeOptions = [
    { value: THEME_OPTIONS.SYSTEM, label: "System", icon: Smartphone },
    { value: THEME_OPTIONS.LIGHT, label: "Light", icon: Sun },
    { value: THEME_OPTIONS.DARK, label: "Dark", icon: Moon },
  ];

  const currentThemeLabel =
    themeOptions.find((opt) => opt.value === themePreference)?.label ||
    "System";

  const isPremium = !!premium.isPremium;
  const premiumSubtitle = isPremium
    ? "Unlimited voice + no partner cards"
    : "10 free voice entries / month, then upgrade";

  return (
    <ScreenLayout variant="profile">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
          paddingTop: 10,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 28,
            color: textPrimary,
          }}
        >
          Profile
        </Text>
        <Text
          style={{
            fontFamily: "Roboto_400Regular",
            fontSize: 14,
            color: textSecondary,
            marginTop: 2,
          }}
        >
          Budget + premium
        </Text>

        <Row
          icon={Moon}
          title="Theme"
          description={`Current: ${currentThemeLabel}`}
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {themeOptions.map((option) => {
              const isSelected = themePreference === option.value;
              const IconComponent = option.icon;

              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    backgroundColor: isSelected
                      ? isDark
                        ? "#FFFFFF"
                        : "#1F2937"
                      : isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.04)",
                  }}
                >
                  <IconComponent
                    size={16}
                    color={
                      isSelected ? (isDark ? "#000" : "#fff") : textSecondary
                    }
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 12,
                      color: isSelected
                        ? isDark
                          ? "#000"
                          : "#fff"
                        : textSecondary,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Row>

        <Row 
          icon={Sparkles} 
          title="Premium" 
          description={premiumSubtitle}
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          <TouchableOpacity
            onPress={openPremium}
            activeOpacity={0.9}
            style={{
              paddingVertical: 14,
              borderRadius: 16,
                  backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
              alignItems: "center",
              justifyContent: "center",
              opacity: premium.isReady ? 1 : 0.7,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: isDark ? "#000" : "#fff",
              }}
            >
              {isPremium ? "Manage subscription" : "Go Premium"}
            </Text>
          </TouchableOpacity>

          {premium.lastError ? (
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 12,
                color: textSecondary,
                marginTop: 10,
              }}
            >
              Purchases status: {premium.lastError}
            </Text>
          ) : null}
        </Row>

        <Row
          icon={Wallet}
          title="Budget"
          description={budgetDescription}
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          {/* Budget Period Selector */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 16,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "#F9FAFB",
              borderRadius: 14,
              padding: 4,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(0,0,0,0.08)",
            }}
          >
            <TouchableOpacity
              onPress={() => setSelectedBudgetPeriod("weekly")}
              activeOpacity={0.75}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor:
                  selectedBudgetPeriod === "weekly"
                    ? isDark
                      ? "#FFFFFF"
                      : "#1F2937"
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color:
                    selectedBudgetPeriod === "weekly"
                      ? isDark
                        ? "#000"
                        : "#fff"
                      : textSecondary,
                }}
              >
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedBudgetPeriod("monthly")}
              activeOpacity={0.75}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor:
                  selectedBudgetPeriod === "monthly"
                    ? isDark
                      ? "#FFFFFF"
                      : "#1F2937"
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color:
                    selectedBudgetPeriod === "monthly"
                      ? isDark
                        ? "#000"
                        : "#fff"
                      : textSecondary,
                }}
              >
                Monthly
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            key="budget-input"
            value={budgetDraft}
            onChangeText={setBudgetDraft}
            placeholder={budgetPlaceholder}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
            keyboardType="numeric"
            blurOnSubmit={false}
            style={budgetInputStyle}
          />
          <TouchableOpacity
            onPress={saveBudget}
            disabled={!deviceId || updateBudget.isPending}
            activeOpacity={0.9}
            style={{
              marginTop: 12,
              paddingVertical: 14,
              borderRadius: 16,
                  backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
              alignItems: "center",
              justifyContent: "center",
              opacity: !deviceId || updateBudget.isPending ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: isDark ? "#000" : "#fff",
              }}
            >
              Save
            </Text>
          </TouchableOpacity>
        </Row>

        <Row
          icon={Shield}
          title="Data model"
          description="This MVP runs without sign-in. Your data is stored per-device."
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 12,
              color: textSecondary,
            }}
          >
            If you want multi-device sync and sharing, enable User Accounts in
            the project settings.
          </Text>
        </Row>

        {settingsQuery.isLoading ? (
          <Text
            style={{ fontFamily: "Roboto_400Regular", color: textSecondary }}
          >
            Loading settings…
          </Text>
        ) : settingsQuery.error ? (
          <Text
            style={{ fontFamily: "Roboto_400Regular", color: textSecondary }}
          >
            Could not load settings.
          </Text>
        ) : null}
      </ScrollView>
    </ScreenLayout>
  );
}
