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
  User,
  LogOut,
  Edit2,
  Key,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react-native";

import ScreenLayout from "@/components/ScreenLayout";
import useDeviceId from "@/utils/useDeviceId";
import { formatMoney, toCentsFromLooseNumber, resolveApiUrl } from "@/utils/api";
import { useDeviceSettings, useUpdateWeeklyBudget } from "@/utils/queries";
import { presentPremiumPaywall, usePremium } from "@/utils/premium";
import { useTheme, THEME_OPTIONS } from "@/utils/theme";
import { useAuth, useAuthStore } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";

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
  const { auth, setAuth, signOut } = useAuth();
  const router = useRouter();

  const settingsQuery = useDeviceSettings({ deviceId });
  const updateBudget = useUpdateWeeklyBudget({ deviceId });

  const currency = settingsQuery.data?.currency_code || "USD";
  const weeklyBudgetCents = settingsQuery.data?.weekly_budget_cents || 0;
  const monthlyBudgetCents = settingsQuery.data?.monthly_budget_cents || 0;
  const budgetPeriod = settingsQuery.data?.budget_period || "weekly";

  const [budgetDraft, setBudgetDraft] = useState("");
  const [selectedBudgetPeriod, setSelectedBudgetPeriod] = useState(budgetPeriod);

  // User profile state
  const [userName, setUserName] = useState(auth?.user?.name || "");
  const [userEmail, setUserEmail] = useState(auth?.user?.email || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "#fff";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  // Sync user data from auth
  useEffect(() => {
    if (auth?.user) {
      setUserName(auth.user.name || "");
      setUserEmail(auth.user.email || "");
    }
  }, [auth]);

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
    backgroundColor: inputBg,
    borderWidth: 1,
    borderColor: borderColor,
  }), [textPrimary, inputBg, borderColor]);

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

  // Update profile
  const handleUpdateProfile = useCallback(async () => {
    if (!userName.trim() || !userEmail.trim()) {
      setProfileError("Name and email are required");
      return;
    }

    setProfileLoading(true);
    setProfileError("");

    try {
      const url = resolveApiUrl("/api/user/profile");
      const token = auth?.jwt;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.error || "Failed to update profile");
        setProfileLoading(false);
        return;
      }

      // Update auth store with new user data and JWT
      setAuth({
        jwt: data.jwt,
        user: data.user,
      });

      setIsEditingProfile(false);
      setProfileLoading(false);
    } catch (err) {
      console.error("Update profile error:", err);
      setProfileError("An error occurred. Please try again.");
      setProfileLoading(false);
    }
  }, [userName, userEmail, auth?.jwt, setAuth]);

  // Change password
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");

    try {
      const url = resolveApiUrl("/api/user/password");
      const token = auth?.jwt;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Failed to change password");
        setPasswordLoading(false);
        return;
      }

      // Clear password fields and close
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      setPasswordLoading(false);
      
      Alert.alert("Success", "Password changed successfully");
    } catch (err) {
      console.error("Change password error:", err);
      setPasswordError("An error occurred. Please try again.");
      setPasswordLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, auth?.jwt]);

  // Delete account
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const url = resolveApiUrl("/api/user/account");
              const token = auth?.jwt;
              
              const response = await fetch(url, {
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const data = await response.json();
                Alert.alert("Error", data.error || "Failed to delete account");
                return;
              }

              // Sign out and redirect to login
              signOut();
              router.replace("/");
            } catch (err) {
              console.error("Delete account error:", err);
              Alert.alert("Error", "An error occurred. Please try again.");
            }
          },
        },
      ]
    );
  }, [auth?.jwt, signOut, router]);

  // Logout
  const handleLogout = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            signOut();
            router.replace("/");
          },
        },
      ]
    );
  }, [signOut, router]);

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

        {/* User Info Section */}
        <Row
          icon={User}
          title={auth?.user?.name || "User"}
          description={auth?.user?.email || ""}
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          {!isEditingProfile ? (
            <TouchableOpacity
              onPress={() => setIsEditingProfile(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F9FAFB",
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <Edit2 size={16} color={textPrimary} />
              <Text
                style={{
                  marginLeft: 8,
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color: textPrimary,
                }}
              >
                Edit Profile
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <TextInput
                placeholder="Name"
                placeholderTextColor={textSecondary}
                value={userName}
                onChangeText={setUserName}
                style={budgetInputStyle}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={textSecondary}
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[budgetInputStyle, { marginTop: 12 }]}
              />
              {profileError ? (
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 12,
                    color: "#EF4444",
                    marginTop: 8,
                  }}
                >
                  {profileError}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingProfile(false);
                    setProfileError("");
                    setUserName(auth?.user?.name || "");
                    setUserEmail(auth?.user?.email || "");
                  }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: borderColor,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: textPrimary,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleUpdateProfile}
                  disabled={profileLoading}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
                    alignItems: "center",
                    opacity: profileLoading ? 0.7 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: isDark ? "#000" : "#fff",
                    }}
                  >
                    {profileLoading ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Row>

        {/* Change Password Section */}
        <Row
          icon={Key}
          title="Password"
          description={isChangingPassword ? "Change your password" : "Update your password"}
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          {!isChangingPassword ? (
            <TouchableOpacity
              onPress={() => setIsChangingPassword(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F9FAFB",
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <Key size={16} color={textPrimary} />
              <Text
                style={{
                  marginLeft: 8,
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color: textPrimary,
                }}
              >
                Change Password
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={{ position: "relative" }}>
                <TextInput
                  placeholder="Current Password"
                  placeholderTextColor={textSecondary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  style={budgetInputStyle}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: 12,
                  }}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} color={textSecondary} />
                  ) : (
                    <Eye size={18} color={textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ position: "relative", marginTop: 12 }}>
                <TextInput
                  placeholder="New Password"
                  placeholderTextColor={textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  style={budgetInputStyle}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: 12,
                  }}
                >
                  {showNewPassword ? (
                    <EyeOff size={18} color={textSecondary} />
                  ) : (
                    <Eye size={18} color={textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ position: "relative", marginTop: 12 }}>
                <TextInput
                  placeholder="Confirm New Password"
                  placeholderTextColor={textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={budgetInputStyle}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: 12,
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={textSecondary} />
                  ) : (
                    <Eye size={18} color={textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 12,
                    color: "#EF4444",
                    marginTop: 8,
                  }}
                >
                  {passwordError}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setIsChangingPassword(false);
                    setPasswordError("");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: borderColor,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: textPrimary,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
                    alignItems: "center",
                    opacity: passwordLoading ? 0.7 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 14,
                      color: isDark ? "#000" : "#fff",
                    }}
                  >
                    {passwordLoading ? "Changing..." : "Change"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Row>

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
          title="Data & Privacy"
          description="Your data is securely stored in your account"
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
            All your expenses, budgets, and settings are tied to your account and sync across all your devices.
          </Text>
        </Row>

        {/* Logout Section */}
        <Row
          icon={LogOut}
          title="Sign Out"
          description="Sign out of your account"
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={{
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
              borderWidth: 1,
              borderColor: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: "#EF4444",
              }}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </Row>

        {/* Delete Account Section */}
        <Row
          icon={Trash2}
          title="Delete Account"
          description="Permanently delete your account and all data"
          cardBg={cardBg}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        >
          <TouchableOpacity
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            style={{
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
              borderWidth: 1,
              borderColor: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: "#EF4444",
              }}
            >
              Delete Account
            </Text>
          </TouchableOpacity>
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
