import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useTheme } from "@/utils/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Trash2, Edit2 } from "lucide-react-native";
import { CATEGORY_STYLES, normalizeCategory, normalizeIncomeCategory, getCategoryStyle, getIncomeCategoryStyle } from "@/utils/categories";
import { getVendorLogo } from "@/utils/vendors";
import { formatMoney } from "@/utils/api";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (isToday(d)) {
      return `Today at ${format(d, "h:mm a")}`;
    } else if (isYesterday(d)) {
      return `Yesterday at ${format(d, "h:mm a")}`;
    } else if (isThisWeek(d)) {
      return format(d, "EEEE 'at' h:mm a");
    } else {
      return format(d, "MMM d, yyyy 'at' h:mm a");
    }
  } catch {
    return "";
  }
}

export default function ExpenseCard({
  expense,
  currency = "USD",
  onPress,
  onDelete,
  onEdit,
}) {
  // Defensive check - return null if expense is invalid
  if (!expense || typeof expense !== 'object') {
    return null;
  }

  const { isDark } = useTheme();
  const [logoError, setLogoError] = useState(false);

  const isIncome = expense?.type === 'income';
  
  // Add fallbacks for all expense properties
  const category = isIncome 
    ? normalizeIncomeCategory(expense?.category || "Other Income")
    : normalizeCategory(expense?.category || "Other");
  const style = isIncome
    ? getIncomeCategoryStyle(category)
    : getCategoryStyle(category);
  const vendorLogo = getVendorLogo(expense?.vendor);

  // Debug logging
  if (expense?.vendor) {
    console.log('🔍 ExpenseCard DEBUG:');
    console.log('  Vendor:', expense.vendor);
    console.log('  VendorLogo:', vendorLogo);
    console.log('  logoUrl:', vendorLogo?.logoUrl);
    console.log('  logoUrl type:', typeof vendorLogo?.logoUrl);
  }

  const amountText = useMemo(() => {
    const amount = expense?.amount_cents ?? 0;
    const formatted = formatMoney(amount, currency);
    // Add + prefix for income
    return isIncome ? `+${formatted}` : formatted;
  }, [expense?.amount_cents, currency, isIncome]);

  const vendor = expense?.vendor ? String(expense.vendor) : category;
  const dateTime = formatDate(expense?.occurred_at);

  // Use vendor logo if available, otherwise use category style
  // If logoUrl exists and no error, use image; otherwise fallback to emoji
  const hasLogoUrl = vendorLogo?.logoUrl && typeof vendorLogo.logoUrl === 'string' && vendorLogo.logoUrl.trim() !== '' && !logoError;
  
  // Debug logging
  if (expense?.vendor) {
    console.log('  hasLogoUrl:', hasLogoUrl);
    console.log('  logoError:', logoError);
    console.log('  iconConfig.type:', vendorLogo && hasLogoUrl ? 'image' : 'icon');
  }
  
  // Always fall back to category icon when vendor logo is not available or fails
  const iconConfig = vendorLogo && hasLogoUrl
    ? {
        type: "image",
        logoUrl: vendorLogo.logoUrl,
        backgroundColor: vendorLogo.bgColor || style.accent,
        fallbackIcon: style.icon, // Use category icon as fallback
      }
    : {
        type: "icon",
        icon: style.icon, // Always use category icon when no vendor logo
        backgroundColor: style.accent,
      };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{ marginBottom: 12 }}
    >
      <LinearGradient
        colors={
          isDark
            ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]
            : ["#FFFFFF", "#FFFFFF"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.22 : 0.1,
          shadowRadius: 16,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: iconConfig.backgroundColor,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              overflow: "hidden",
            }}
          >
            {iconConfig.type === "image" && iconConfig.logoUrl && typeof iconConfig.logoUrl === 'string' ? (
              <Image
                source={{ uri: iconConfig.logoUrl }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                onError={(error) => {
                  console.log('❌ Image load error for vendor:', expense?.vendor);
                  console.log('  URL:', iconConfig.logoUrl);
                  console.log('  Error:', error);
                  setLogoError(true);
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully for vendor:', expense?.vendor);
                  console.log('  URL:', iconConfig.logoUrl);
                }}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: 18 }}>{iconConfig.icon || style.icon}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: isDark ? "#fff" : "#000",
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {vendor}
            </Text>
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 13,
                color: isDark ? "rgba(255,255,255,0.7)" : "#6B7280",
              }}
              numberOfLines={1}
            >
              {category}
              {dateTime ? ` • ${dateTime}` : ""}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: isIncome 
                  ? (isDark ? "#4ADE80" : "#10B981") // Green for income
                  : (isDark ? "#fff" : "#000"), // Default color for expenses
                marginBottom: 6,
              }}
            >
              {amountText}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {onEdit ? (
                <TouchableOpacity
                  onPress={onEdit}
                  hitSlop={12}
                  activeOpacity={0.75}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.04)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Edit2
                    size={16}
                    color={isDark ? "rgba(255,255,255,0.85)" : "#111"}
                  />
                </TouchableOpacity>
              ) : null}
              {onDelete ? (
                <TouchableOpacity
                  onPress={onDelete}
                  hitSlop={12}
                  activeOpacity={0.75}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.04)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2
                    size={16}
                    color={isDark ? "rgba(255,255,255,0.85)" : "#111"}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {expense?.note ? (
          <Text
            style={{
              marginTop: 10,
              fontFamily: "Roboto_400Regular",
              fontSize: 13,
              color: isDark ? "rgba(255,255,255,0.75)" : "#374151",
            }}
            numberOfLines={2}
          >
            {String(expense.note)}
          </Text>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}
