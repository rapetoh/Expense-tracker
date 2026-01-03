import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Platform,
} from "react-native";
import { useTheme } from "@/utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, X } from "lucide-react-native";
import { format } from "date-fns";

import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import CategoryPickerModal from "@/components/CategoryPickerModal";
import useDeviceId from "@/utils/useDeviceId";
import { formatMoney, toCentsFromLooseNumber } from "@/utils/api";
import { normalizeCategory, normalizeIncomeCategory, INCOME_CATEGORIES } from "@/utils/categories";
import { useCreateExpense, useDeviceSettings } from "@/utils/queries";

export default function AddExpense() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const deviceId = useDeviceId();
  const settingsQuery = useDeviceSettings({ deviceId });
  const currency = settingsQuery.data?.currency_code || "USD";

  const createExpense = useCreateExpense({ deviceId });

  const [amountText, setAmountText] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState("expense"); // "expense" or "income"
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(null); // "weekly", "biweekly", "monthly", "quarterly", "annually"
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset category when type changes
  useEffect(() => {
    if (type === "income") {
      setCategory("Other");
    } else {
      setCategory("Other");
    }
    setIsRecurring(false);
    setRecurrenceFrequency(null);
  }, [type]);

  const amountCents = useMemo(
    () => toCentsFromLooseNumber(amountText),
    [amountText],
  );

  const bg = isDark ? "#121212" : "#FAFAFA";
  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";

  const save = useCallback(async () => {
    try {
      if (!deviceId) return;
      if (!amountCents || amountCents <= 0) {
        Alert.alert("Missing amount", "Add an amount like 12.50");
        return;
      }

      await createExpense.mutateAsync({
        amount_cents: amountCents,
        vendor: vendor.trim() || null,
        category: type === "income" ? normalizeIncomeCategory(category) : normalizeCategory(category),
        note: note.trim() || null,
        occurred_at: occurredAt.toISOString(),
        type: type,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : null,
      });

      router.back();
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof Error ? e.message : "Could not save your expense.";
      Alert.alert("Error", msg);
    }
    }, [amountCents, category, createExpense, deviceId, note, router, vendor, type, isRecurring, recurrenceFrequency, occurredAt]);

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
              <ArrowLeft size={22} color={textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center", marginRight: 22 }}>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 18,
                  color: textPrimary,
                }}
              >
                {type === "income" ? "Add income" : "Add expense"}
              </Text>
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginTop: 2,
                }}
              >
                Manual entry
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
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
              onPress={() => setType("expense")}
              activeOpacity={0.75}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor:
                  type === "expense"
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
                    type === "expense"
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
              onPress={() => setType("income")}
              activeOpacity={0.75}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor:
                  type === "income"
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
                    type === "income"
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
            Date & Time
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.9}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.03)",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(0,0,0,0.12)",
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 16,
                color: textPrimary,
              }}
            >
              {format(occurredAt, "MMM d, yyyy 'at' h:mm a")}
            </Text>
            <Calendar size={20} color={textSecondary} />
          </TouchableOpacity>

          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: bg,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingTop: 20,
                  paddingBottom: insets.bottom + 20,
                  paddingHorizontal: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
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
                    Set Date & Time
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <X size={24} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 12,
                    color: textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Date & Time (YYYY-MM-DDTHH:mm format, e.g., 2024-01-15T14:30)
                </Text>
                <TextInput
                  defaultValue={format(occurredAt, "yyyy-MM-dd'T'HH:mm")}
                  placeholder="2024-01-15T14:30"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 16,
                    color: textPrimary,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.12)",
                    marginBottom: 20,
                  }}
                  onChangeText={(text) => {
                    try {
                      const date = new Date(text);
                      if (!isNaN(date.getTime())) {
                        setOccurredAt(date);
                      }
                    } catch (e) {
                      // Invalid date, ignore
                    }
                  }}
                />

                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.9}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 16,
                      color: isDark ? "#000" : "#fff",
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 12,
              color: textSecondary,
              marginBottom: 6,
            }}
          >
            Amount
          </Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder={formatMoney(0, currency)}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
            keyboardType="decimal-pad"
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 28,
              color: textPrimary,
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 18,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F9FAFB",
              borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
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
            {type === "income" ? "Source" : "Vendor"}
          </Text>
          <TextInput
            value={vendor}
            onChangeText={setVendor}
            placeholder={type === "income" ? "Employer Name" : "Sweetgreen"}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 16,
              color: textPrimary,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 18,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F9FAFB",
              borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
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
            Category
          </Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.9}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 18,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F9FAFB",
              borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 16,
                color: textPrimary,
              }}
            >
              {type === "income" ? normalizeIncomeCategory(category) : normalizeCategory(category)}
            </Text>
          </TouchableOpacity>

          {/* Recurring Toggle (for both expense and income) */}
          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 12,
              color: textSecondary,
              marginTop: 8,
              marginBottom: 6,
            }}
          >
            {type === "income" ? "Recurring Income" : "Recurring Expense"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setIsRecurring(!isRecurring);
              if (isRecurring) {
                setRecurrenceFrequency(null);
              } else {
                setRecurrenceFrequency("monthly"); // Default to monthly
              }
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: isRecurring ? 12 : 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: isRecurring
                  ? (isDark ? "#10B981" : "#10B981")
                  : (isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB"),
                alignItems: isRecurring ? "flex-end" : "flex-start",
                justifyContent: "center",
                paddingHorizontal: 2,
                marginRight: 12,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#FFFFFF",
                }}
              />
            </View>
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 14,
                color: textPrimary,
              }}
            >
              {type === "income" ? "This is recurring income" : "This is a recurring expense"}
            </Text>
          </TouchableOpacity>

          {isRecurring && (
            <>
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                Frequency
              </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      { label: "Weekly", value: "weekly" },
                      { label: "Biweekly", value: "biweekly" },
                      { label: "Monthly", value: "monthly" },
                      { label: "Quarterly", value: "quarterly" },
                      { label: "Annually", value: "annually" },
                    ].map((freq) => (
                      <TouchableOpacity
                        key={freq.value}
                        onPress={() => setRecurrenceFrequency(freq.value)}
                        activeOpacity={0.75}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor:
                            recurrenceFrequency === freq.value
                              ? isDark
                                ? "#10B981"
                                : "#10B981"
                              : isDark
                                ? "rgba(255,255,255,0.06)"
                                : "#F3F4F6",
                          borderWidth: 1,
                          borderColor:
                            recurrenceFrequency === freq.value
                              ? isDark
                                ? "#10B981"
                                : "#10B981"
                              : isDark
                                ? "rgba(255,255,255,0.10)"
                                : "#E5E7EB",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins_600SemiBold",
                            fontSize: 13,
                            color:
                              recurrenceFrequency === freq.value
                                ? "#FFFFFF"
                                : textPrimary,
                          }}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

          <Text
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 12,
              color: textSecondary,
              marginBottom: 6,
            }}
          >
            Note
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="(optional)"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
            style={{
              fontFamily: "Roboto_400Regular",
              fontSize: 16,
              color: textPrimary,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 18,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F9FAFB",
              borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
              marginBottom: 20,
            }}
          />

          <TouchableOpacity
            onPress={save}
            disabled={!deviceId || createExpense.isPending}
            activeOpacity={0.9}
            style={{
              paddingVertical: 16,
              borderRadius: 20,
              backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
              alignItems: "center",
              justifyContent: "center",
              opacity: !deviceId || createExpense.isPending ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: isDark ? "#000" : "#fff",
              }}
            >
              Save
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <CategoryPickerModal
          visible={pickerOpen}
          selected={category}
          isIncome={type === "income"}
          onClose={() => setPickerOpen(false)}
          onPick={(c) => {
            setPickerOpen(false);
            setCategory(c);
          }}
        />
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
