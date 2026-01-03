import React, { useMemo, useState, useEffect } from "react";
import { ScrollView, Text, View, TouchableOpacity, Modal, TextInput, Alert, Platform, ActionSheetIOS } from "react-native";
import { useRouter } from "expo-router";
import { Plus, X, Download, Edit2, Trash2 } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import ScreenLayout from "@/components/ScreenLayout";
import useDeviceId from "@/utils/useDeviceId";
import { useCategoryStats, useDeviceSettings, useCustomCategories, useCreateCustomCategory, useUpdateCustomCategory, useDeleteCustomCategory, useExpenses } from "@/utils/queries";
import { CATEGORY_STYLES, CATEGORIES, INCOME_CATEGORIES, normalizeCategory, normalizeIncomeCategory, getAllCategories, getAllIncomeCategories, getCategoryStyle, getIncomeCategoryStyle } from "@/utils/categories";
import { formatMoney, resolveApiUrl } from "@/utils/api";
import { useTheme } from "@/utils/theme";

export default function Grid() {
  const router = useRouter();
  const { isDark } = useTheme();
  const deviceId = useDeviceId();

  const [gridFilter, setGridFilter] = useState("expense"); // "expense", "income", "all"
  const categoryStatsQuery = useCategoryStats({ deviceId, type: gridFilter === "all" ? "expense" : gridFilter });
  const incomeStatsQuery = useCategoryStats({ deviceId, type: "income" });
  const settingsQuery = useDeviceSettings({ deviceId });
  const customCategoriesQuery = useCustomCategories({ deviceId });
  const createCategory = useCreateCustomCategory({ deviceId });
  const updateCategory = useUpdateCustomCategory({ deviceId });
  const deleteCategory = useDeleteCustomCategory({ deviceId });
  
  const currency = settingsQuery.data?.currency_code || "USD";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("✨");
  const [newCategoryType, setNewCategoryType] = useState("expense");
  const [editingCategory, setEditingCategory] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";

  const customCategories = customCategoriesQuery.data?.categories || [];
  
  const allCategories = useMemo(() => {
    if (gridFilter === "income") {
      return getAllIncomeCategories(customCategories);
    } else if (gridFilter === "expense") {
      return getAllCategories(customCategories);
    } else {
      // "all" - combine both
      return [...getAllCategories(customCategories), ...getAllIncomeCategories(customCategories)];
    }
  }, [customCategories, gridFilter]);

  const totalsByCategory = useMemo(() => {
    const map = new Map();
    
    if (gridFilter === "expense" || gridFilter === "all") {
      const buckets = categoryStatsQuery.data?.category_buckets || [];
      buckets.forEach((b) => {
        const normalized = normalizeCategory(b.category, customCategories);
        const existing = map.get(normalized) || 0;
        map.set(normalized, existing + b.total_cents);
      });
    }
    
    if (gridFilter === "income" || gridFilter === "all") {
      const buckets = incomeStatsQuery.data?.category_buckets || [];
      buckets.forEach((b) => {
        const normalized = normalizeIncomeCategory(b.category, customCategories);
        const existing = map.get(normalized) || 0;
        map.set(normalized, existing + b.total_cents);
      });
    }
    
    return map;
  }, [categoryStatsQuery.data, incomeStatsQuery.data, customCategories, gridFilter]);

  const navigateToCategory = (categoryName) => {
    router.push(`/category/${encodeURIComponent(categoryName)}`);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    try {
      await createCategory.mutateAsync({
        category_name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: "#F6F6F6",
        type: newCategoryType,
      });
      setShowCreateModal(false);
      setNewCategoryName("");
      setNewCategoryIcon("✨");
      setNewCategoryType("expense");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not create category");
    }
  };

  const handleLongPress = (categoryName) => {
    // Find if it's a custom category
    const customCategory = customCategories.find(
      (c) => c.category_name && c.category_name.toLowerCase() === categoryName.toLowerCase(),
    );

    if (!customCategory) {
      // Standard categories can't be edited/deleted
      return;
    }

    const isIncome = customCategory.type === 'income';

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Delete"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setEditingCategory(customCategory);
            setShowEditModal(true);
          } else if (buttonIndex === 2) {
            handleDeleteCategory(customCategory);
          }
        },
      );
    } else {
      Alert.alert(
        "Category Options",
        `Choose an action for "${categoryName}"`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Edit",
            onPress: () => {
              setEditingCategory(customCategory);
              setShowEditModal(true);
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteCategory(customCategory),
          },
        ],
      );
    }
  };

  const handleDeleteCategory = (category) => {
    Alert.alert(
      "Delete Category?",
      `Are you sure you want to delete "${category.category_name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync({ id: category.id });
            } catch (error) {
              Alert.alert("Error", error.message || "Could not delete category");
            }
          },
        },
      ],
    );
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        category_name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: editingCategory.color || "#F6F6F6",
        type: newCategoryType,
      });
      setShowEditModal(false);
      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryIcon("✨");
      setNewCategoryType("expense");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not update category");
    }
  };

  // Populate edit modal when editingCategory changes
  useEffect(() => {
    if (editingCategory) {
      setNewCategoryName(editingCategory.category_name || "");
      setNewCategoryIcon(editingCategory.icon || "✨");
      setNewCategoryType(editingCategory.type || "expense");
    }
  }, [editingCategory]);

  const handleExportCSV = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Fetch CSV from API
      const exportUrl = resolveApiUrl("/api/expenses/export");
      const response = await fetch(exportUrl, {
        method: "GET",
        headers: {
          "x-device-id": deviceId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export expenses");
      }

      const csvText = await response.text();
      
      // Create file
      const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvText);

      // Share file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Export Complete", `File saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", error.message || "Could not export expenses");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenLayout variant="grid">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
          paddingTop: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 28,
                color: textPrimary,
              }}
            >
              Grid
            </Text>
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 14,
                color: textSecondary,
                marginTop: 2,
              }}
            >
              {gridFilter === "expense" ? "Expense categories" : gridFilter === "income" ? "Income categories" : "All categories"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportCSV}
            disabled={isExporting}
            activeOpacity={0.85}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: cardBg,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(0,0,0,0.08)",
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            <Download size={20} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Filter Toggle */}
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            marginTop: 16,
            marginBottom: 8,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "#F9FAFB",
            borderRadius: 12,
            padding: 3,
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.12)",
          }}
        >
          <TouchableOpacity
            onPress={() => setGridFilter("expense")}
            activeOpacity={0.75}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor:
                gridFilter === "expense"
                  ? isDark
                    ? "#FFFFFF"
                    : "#1F2937"
                  : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 12,
                color:
                  gridFilter === "expense"
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : textSecondary,
                textAlign: "center",
              }}
            >
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGridFilter("income")}
            activeOpacity={0.75}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor:
                gridFilter === "income"
                  ? isDark
                    ? "#FFFFFF"
                    : "#1F2937"
                  : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 12,
                color:
                  gridFilter === "income"
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : textSecondary,
                textAlign: "center",
              }}
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGridFilter("all")}
            activeOpacity={0.75}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor:
                gridFilter === "all"
                  ? isDark
                    ? "#FFFFFF"
                    : "#1F2937"
                  : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 12,
                color:
                  gridFilter === "all"
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : textSecondary,
                textAlign: "center",
              }}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 18,
          }}
        >
          {allCategories.map((c) => {
            // Determine if this is an income category
            const customCategory = customCategories.find(
              (cat) => cat.category_name && cat.category_name.toLowerCase() === c.toLowerCase(),
            );
            const isIncomeCategory = customCategory?.type === 'income' || 
              (!customCategory && INCOME_CATEGORIES.includes(c)) ||
              (gridFilter === "income" && !CATEGORIES.includes(c));
            
            const style = isIncomeCategory 
              ? getIncomeCategoryStyle(c, customCategories)
              : getCategoryStyle(c, customCategories);
            const total = totalsByCategory.get(c) || 0;
            const isCustom = !!customCategory;

            // Create unique key by prefixing with type to avoid duplicates (e.g., "Other" exists in both expense and income)
            const uniqueKey = `${isIncomeCategory ? 'income' : 'expense'}-${c}`;

            return (
              <TouchableOpacity
                key={uniqueKey}
                onPress={() => navigateToCategory(c)}
                onLongPress={() => handleLongPress(c)}
                activeOpacity={0.85}
                style={{
                  width: "48%",
                  borderRadius: 20,
                  padding: 16,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.75)",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: style.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{style.icon}</Text>
                </View>

                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 15,
                    color: textPrimary,
                  }}
                >
                  {c}
                </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 13,
                    color: textSecondary,
                    marginTop: 4,
                    flex: 1,
                  }}
                >
                  {formatMoney(total, currency)}
                </Text>
                {isCustom && (
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                    <Edit2 size={14} color={textSecondary} />
                  </View>
                )}
              </View>
              </TouchableOpacity>
            );
          })}
          
          {/* Add Category Button */}
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.85}
            style={{
              width: "48%",
              borderRadius: 20,
              padding: 16,
              backgroundColor: cardBg,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: isDark
                ? "rgba(255,255,255,0.20)"
                : "rgba(0,0,0,0.15)",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 120,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.05)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Plus size={20} color={textSecondary} />
            </View>
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 13,
                color: textSecondary,
              }}
            >
              Add Category
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Category Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? "#121212" : "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 40,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 18,
                    color: textPrimary,
                  }}
                >
                  Create Category
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewCategoryName("");
                    setNewCategoryIcon("✨");
                    setNewCategoryType("expense");
                  }}
                  hitSlop={10}
                >
                  <X size={22} color={textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Type Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 16,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#F9FAFB",
                  borderRadius: 18,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.12)",
                }}
              >
                <TouchableOpacity
                  onPress={() => setNewCategoryType("expense")}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor:
                      newCategoryType === "expense"
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
                      fontSize: 14,
                      color:
                        newCategoryType === "expense"
                          ? isDark
                            ? "#000"
                            : "#fff"
                          : textSecondary,
                    }}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNewCategoryType("income")}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor:
                      newCategoryType === "income"
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
                      fontSize: 14,
                      color:
                        newCategoryType === "income"
                          ? isDark
                            ? "#000"
                            : "#fff"
                          : textSecondary,
                    }}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                Category Name
              </Text>
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="e.g., Pets, Hobbies"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 16,
                  color: textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                  marginBottom: 14,
                }}
              />

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                Icon (emoji)
              </Text>
              <TextInput
                value={newCategoryIcon}
                onChangeText={setNewCategoryIcon}
                placeholder="✨"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 16,
                  color: textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                  marginBottom: 20,
                }}
              />

              <TouchableOpacity
                onPress={handleCreateCategory}
                disabled={!newCategoryName.trim() || createCategory.isPending}
                activeOpacity={0.9}
                style={{
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !newCategoryName.trim() || createCategory.isPending ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: isDark ? "#000" : "#fff",
                  }}
                >
                  {createCategory.isPending ? "Creating..." : "Create Category"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Category Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? "#121212" : "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 40,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 18,
                    color: textPrimary,
                  }}
                >
                  Edit Category
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryIcon("✨");
                    setNewCategoryType("expense");
                  }}
                  hitSlop={10}
                >
                  <X size={22} color={textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Type Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 16,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#F9FAFB",
                  borderRadius: 18,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.12)",
                }}
              >
                <TouchableOpacity
                  onPress={() => setNewCategoryType("expense")}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor:
                      newCategoryType === "expense"
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
                      fontSize: 14,
                      color:
                        newCategoryType === "expense"
                          ? isDark
                            ? "#000"
                            : "#fff"
                          : textSecondary,
                    }}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNewCategoryType("income")}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor:
                      newCategoryType === "income"
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
                      fontSize: 14,
                      color:
                        newCategoryType === "income"
                          ? isDark
                            ? "#000"
                            : "#fff"
                          : textSecondary,
                    }}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                Category Name
              </Text>
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="e.g., Pets, Hobbies"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 16,
                  color: textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                  marginBottom: 14,
                }}
              />

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                Icon (emoji)
              </Text>
              <TextInput
                value={newCategoryIcon}
                onChangeText={setNewCategoryIcon}
                placeholder="✨"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 16,
                  color: textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                  marginBottom: 20,
                }}
              />

              <TouchableOpacity
                onPress={handleUpdateCategory}
                disabled={!newCategoryName.trim() || updateCategory.isPending}
                activeOpacity={0.9}
                style={{
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !newCategoryName.trim() || updateCategory.isPending ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: isDark ? "#000" : "#fff",
                  }}
                >
                  {updateCategory.isPending ? "Updating..." : "Update Category"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenLayout>
  );
}
