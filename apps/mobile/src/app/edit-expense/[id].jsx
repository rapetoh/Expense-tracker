import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Sparkles, Calendar, X } from "lucide-react-native";
import { format } from "date-fns";

import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import CategoryPickerModal from "@/components/CategoryPickerModal";
import useDeviceId from "@/utils/useDeviceId";
import { formatMoney, toCentsFromLooseNumber, apiFetchJson } from "@/utils/api";
import { normalizeCategory, normalizeIncomeCategory } from "@/utils/categories";
import { useUpdateExpense, useDeviceSettings } from "@/utils/queries";
import { useTheme } from "@/utils/theme";

export default function EditExpense() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const deviceId = useDeviceId();
  const settingsQuery = useDeviceSettings({ deviceId });
  const currency = settingsQuery.data?.currency_code || "USD";

  const updateExpense = useUpdateExpense({ deviceId });

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amountText, setAmountText] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState("expense"); // "expense" or "income"
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(null);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load expense data
  useEffect(() => {
    const loadExpense = async () => {
      try {
        if (!deviceId || !id) return;
        const data = await apiFetchJson(`/api/expenses/${id}`, { deviceId });
        setExpense(data);
        setAmountText(formatMoney(data.amount_cents, currency).replace(/[^0-9.,]/g, ''));
        setVendor(data.vendor || "");
        setCategory(data.category || "Other");
        setNote(data.note || "");
        setType(data.type || "expense");
        setIsRecurring(data.is_recurring || false);
        setRecurrenceFrequency(data.recurrence_frequency || null);
        setOccurredAt(data.occurred_at ? new Date(data.occurred_at) : new Date());
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Could not load expense.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    loadExpense();
  }, [deviceId, id, currency, router]);

  const amountCents = useMemo(
    () => toCentsFromLooseNumber(amountText),
    [amountText],
  );

  const bg = isDark ? "#121212" : "#FAFAFA";
  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";

  const save = useCallback(async () => {
    try {
      if (!deviceId || !id) return;
      if (!amountCents || amountCents <= 0) {
        Alert.alert("Missing amount", "Add an amount like 12.50");
        return;
      }

      await updateExpense.mutateAsync({
        id: Number(id),
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
        e instanceof Error ? e.message : "Could not update your expense.";
      Alert.alert("Error", msg);
    }
    }, [amountCents, category, updateExpense, deviceId, id, note, router, vendor, type, isRecurring, recurrenceFrequency, occurredAt]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={textPrimary} />
      </View>
    );
  }

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
                {type === "income" ? "Edit income" : "Edit expense"}
              </Text>
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginTop: 2,
                }}
              >
                Update details
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
                : "rgba(0,0,0,0.03)",
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
                : "rgba(0,0,0,0.03)",
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
                : "rgba(0,0,0,0.03)",
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
          <View style={{ marginBottom: 10 }}>
            <Text
              style={{
                fontFamily: "Roboto_400Regular",
                fontSize: 12,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              {type === "income" ? "Recurring Income?" : "Recurring Expense?"}
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
              activeOpacity={0.9}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.85)",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.06)",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Roboto_400Regular", fontSize: 16, color: textPrimary }}>
                {isRecurring ? "Yes" : "No"}
              </Text>
              <Sparkles size={18} color={isRecurring ? (isDark ? "#BFD4FF" : "#6366F1") : textSecondary} />
            </TouchableOpacity>
          </View>

          {isRecurring && (
                <View style={{ marginBottom: 10 }}>
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
                    }}
                  >
                    {["weekly", "biweekly", "monthly", "quarterly", "annually"].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        onPress={() => setRecurrenceFrequency(freq)}
                        activeOpacity={0.75}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor:
                            recurrenceFrequency === freq
                              ? isDark
                                ? "rgba(255,255,255,0.15)"
                                : "#1F2937"
                              : cardBg,
                          borderWidth: 1,
                          borderColor:
                            recurrenceFrequency === freq
                              ? isDark
                                ? "rgba(255,255,255,0.20)"
                                : "rgba(0,0,0,0.10)"
                              : isDark
                                ? "rgba(255,255,255,0.10)"
                                : "rgba(0,0,0,0.08)",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 12,
                            color:
                              recurrenceFrequency === freq
                                ? isDark
                                  ? "#fff"
                                  : "#fff"
                                : textSecondary,
                          }}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
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
                : "rgba(0,0,0,0.03)",
              borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
              marginBottom: 20,
            }}
          />

          <TouchableOpacity
            onPress={save}
            disabled={!deviceId || updateExpense.isPending}
            activeOpacity={0.9}
            style={{
              paddingVertical: 16,
              borderRadius: 20,
                  backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
              alignItems: "center",
              justifyContent: "center",
              opacity: !deviceId || updateExpense.isPending ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: isDark ? "#000" : "#fff",
              }}
            >
              {updateExpense.isPending ? "Saving..." : "Save changes"}
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

