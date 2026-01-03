import React, { useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import ExpenseCard from "@/components/ExpenseCard";
import EmptyState from "@/components/EmptyState";
import useDeviceId from "@/utils/useDeviceId";
import {
  useExpenses,
  useDeleteExpense,
  useDeviceSettings,
  useCustomCategories,
} from "@/utils/queries";
//import { useRouter } from "expo-router";
import { CATEGORY_STYLES, normalizeCategory, getCategoryStyle } from "@/utils/categories";
import { formatMoney } from "@/utils/api";
import { useTheme } from "@/utils/theme";

export default function CategoryDetail() {
  const router = useRouter();
  const { name } = useLocalSearchParams();
  const categoryName = decodeURIComponent(String(name));
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const deviceId = useDeviceId();

  const expensesQuery = useExpenses({ deviceId, limit: 500 });
  const deleteExpense = useDeleteExpense({ deviceId });
  const settingsQuery = useDeviceSettings({ deviceId });
  const customCategoriesQuery = useCustomCategories({ deviceId });
  const currency = settingsQuery.data?.currency_code || "USD";

  const customCategories = customCategoriesQuery.data?.categories || [];
  const normalizedCategory = normalizeCategory(categoryName, customCategories);
  const categoryStyle = getCategoryStyle(normalizedCategory, customCategories);

  // Filter expenses for this category
  const categoryExpenses = useMemo(() => {
    if (!expensesQuery.data?.items) return [];
    return expensesQuery.data.items.filter(
      (expense) => normalizeCategory(expense.category, customCategories) === normalizedCategory,
    );
  }, [expensesQuery.data?.items, normalizedCategory, customCategories]);

  // Calculate total for this category
  const categoryTotal = useMemo(() => {
    return categoryExpenses.reduce(
      (sum, expense) => sum + expense.amount_cents,
      0,
    );
  }, [categoryExpenses]);

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";
  const bgSecondary = isDark ? "#1E1E1E" : "#F5F5F5";

  const onEdit = (expense) => {
    router.push(`/edit-expense/${expense.id}`);
  };

  const onDelete = (expense) => {
    Alert.alert("Delete expense?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteExpense.mutate({ id: expense.id });
        },
      },
    ]);
  };

  const goBack = () => {
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#000" : "#FAFAFA",
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: bgSecondary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <ArrowLeft size={20} color={textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: categoryStyle.accent,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 14 }}>{categoryStyle.icon}</Text>
            </View>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 22,
                color: textPrimary,
              }}
            >
              {categoryName}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 14,
              color: textSecondary,
              marginLeft: 44, // Align with category name
            }}
          >
            {formatMoney(categoryTotal, currency)} total
          </Text>
        </View>
      </View>

      {/* Expenses List */}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {expensesQuery.isLoading ? (
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              color: textSecondary,
              marginTop: 20,
            }}
          >
            Loading expenses...
          </Text>
        ) : expensesQuery.error ? (
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              color: textSecondary,
              marginTop: 20,
            }}
          >
            Could not load expenses.
          </Text>
        ) : categoryExpenses.length === 0 ? (
          <View style={{ marginTop: 40 }}>
            <EmptyState
              title={`No ${categoryName.toLowerCase()} expenses`}
              description="You haven't logged any expenses in this category yet."
            />
          </View>
        ) : (
          <FlatList
            data={categoryExpenses}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ExpenseCard
                expense={item}
                currency={currency}
                onPress={() => {}}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            style={{ marginTop: 8 }}
          />
        )}
      </View>
    </View>
  );
}
