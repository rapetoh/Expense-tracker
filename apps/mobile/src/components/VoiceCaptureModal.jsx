import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/utils/theme";
import { Check, X, Sparkles } from "lucide-react-native";
import { formatMoney, toCentsFromLooseNumber } from "@/utils/api";
import { normalizeCategory, getAllCategories, getAllIncomeCategories, getCategoryStyle } from "@/utils/categories";
import useDeviceId from "@/utils/useDeviceId";
import { useCustomCategories } from "@/utils/queries";

export default function VoiceCaptureModal({
  visible,
  phase,
  transcript,
  draft,
  currency,
  onClose,
  onChangeDraft,
  onOpenCategoryPicker,
  onConfirm,
  error,
  categoryPickerVisible = false,
  onCategoryPick,
  onCategoryPickerClose,
}) {
  const { isDark } = useTheme();
  const deviceId = useDeviceId();
  const customCategoriesQuery = useCustomCategories({ deviceId });
  
  const customCategories = customCategoriesQuery.data?.categories || [];
  const allCategories = useMemo(() => {
    const isIncome = draft?.type === "income";
    if (isIncome) {
      return getAllIncomeCategories();
    }
    return getAllCategories(customCategories);
  }, [draft?.type, customCategories]);

  const isBusy = phase === "processing" || phase === "saving";

  const title = useMemo(() => {
    if (phase === "listening") return "Listening…";
    if (phase === "processing") return "Thinking…";
    if (phase === "confirm") return "Looks right?";
    if (phase === "saving") return "Saving…";
    if (phase === "success") return "Saved";
    if (phase === "error") return "Could not log that";
    return "Voice";
  }, [phase]);

  const safeDraft = draft || {
    amount_cents: null,
    vendor: "",
    category: "Other",
    note: "",
    occurred_at: null,
    type: "expense",
    is_recurring: false,
    recurrence_frequency: null,
  };

  const amountText = useMemo(() => {
    if (safeDraft.amount_cents === null || safeDraft.amount_cents === undefined)
      return "";
    return formatMoney(safeDraft.amount_cents, currency);
  }, [safeDraft.amount_cents, currency]);

  const bg = isDark ? "#121212" : "#FFFFFF";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.70)" : "#6B7280";

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 20 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                marginTop: "auto",
                backgroundColor: bg,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              }}
            >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ width: 24 }} />
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: textPrimary,
              }}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} disabled={isBusy}>
              <X size={22} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Orb */}
          <View style={{ alignItems: "center", paddingVertical: 10 }}>
            <View
              style={{
                width: 86,
                height: 86,
                borderRadius: 43,
                backgroundColor: isDark ? "rgba(255,255,255,0.9)" : "#000",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {phase === "success" ? (
                <Check size={30} color={isDark ? "#000" : "#fff"} />
              ) : (
                <Sparkles size={28} color={isDark ? "#000" : "#fff"} />
              )}
            </View>

            {phase === "listening" ? (
              <Text
                style={{
                  marginTop: 10,
                  fontFamily: "Roboto_400Regular",
                  fontSize: 13,
                  color: textSecondary,
                }}
              >
                Keep holding… release to send
              </Text>
            ) : null}

            {phase === "processing" || phase === "saving" ? (
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator />
                <Text
                  style={{
                    marginLeft: 10,
                    fontFamily: "Roboto_400Regular",
                    fontSize: 13,
                    color: textSecondary,
                  }}
                >
                  {phase === "processing"
                    ? "Transcribing + parsing…"
                    : "Logging expense…"}
                </Text>
              </View>
            ) : null}
          </View>

          {transcript ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                You said
              </Text>
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 14,
                  color: textPrimary,
                }}
              >
                {transcript}
              </Text>
            </View>
          ) : null}

          {phase === "confirm" ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color: textPrimary,
                  marginBottom: 10,
                }}
              >
                Quick edit (optional)
              </Text>

              <View style={{ marginBottom: 10 }}>
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
                  onChangeText={(t) => {
                    const cents = toCentsFromLooseNumber(t);
                    onChangeDraft({ ...safeDraft, amount_cents: cents });
                  }}
                  placeholder="$12.00"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"
                  }
                  keyboardType="decimal-pad"
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 18,
                    color: textPrimary,
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
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 12,
                      color: textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    Vendor
                  </Text>
                  <TextInput
                    value={safeDraft.vendor || ""}
                    onChangeText={(t) =>
                      onChangeDraft({ ...safeDraft, vendor: t })
                    }
                    placeholder="Sweetgreen"
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"
                    }
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 14,
                      color: textPrimary,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F9FAFB",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
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
                    onPress={onOpenCategoryPicker}
                    activeOpacity={0.9}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#F9FAFB",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.12)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Roboto_400Regular",
                        fontSize: 14,
                        color: textPrimary,
                      }}
                    >
                      {normalizeCategory(safeDraft.category)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
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
                  value={safeDraft.note || ""}
                  onChangeText={(t) => onChangeDraft({ ...safeDraft, note: t })}
                  placeholder="(optional)"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"
                  }
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 14,
                    color: textPrimary,
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
                  }}
                />
              </View>

              {/* Recurring Toggle */}
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 12,
                    color: textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {safeDraft.type === "income" ? "Recurring Income" : "Recurring Expense"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newIsRecurring = !safeDraft.is_recurring;
                    onChangeDraft({
                      ...safeDraft,
                      is_recurring: newIsRecurring,
                      recurrence_frequency: newIsRecurring && !safeDraft.recurrence_frequency ? "monthly" : (newIsRecurring ? safeDraft.recurrence_frequency : null),
                    });
                  }}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: safeDraft.is_recurring
                        ? (isDark ? "#10B981" : "#10B981")
                        : (isDark ? "rgba(255,255,255,0.2)" : "#D1D5DB"),
                      alignItems: safeDraft.is_recurring ? "flex-end" : "flex-start",
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
                    {safeDraft.type === "income" ? "This is recurring income" : "This is a recurring expense"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Frequency Selector (shown when recurring is true) */}
              {safeDraft.is_recurring && (
                <View>
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
                    {[
                      { label: "Weekly", value: "weekly" },
                      { label: "Biweekly", value: "biweekly" },
                      { label: "Monthly", value: "monthly" },
                      { label: "Quarterly", value: "quarterly" },
                      { label: "Annually", value: "annually" },
                    ].map((freq) => (
                      <TouchableOpacity
                        key={freq.value}
                        onPress={() =>
                          onChangeDraft({ ...safeDraft, recurrence_frequency: freq.value })
                        }
                        activeOpacity={0.75}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor:
                            safeDraft.recurrence_frequency === freq.value
                              ? isDark
                                ? "#FFFFFF"
                                : "#1F2937"
                              : isDark
                                ? "rgba(255,255,255,0.06)"
                                : "#F9FAFB",
                          borderWidth: 1,
                          borderColor:
                            safeDraft.recurrence_frequency === freq.value
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
                            fontSize: 13,
                            color:
                              safeDraft.recurrence_frequency === freq.value
                                ? isDark
                                  ? "#000"
                                  : "#fff"
                                : textSecondary,
                          }}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {error ? (
            <View
              style={{
                backgroundColor: isDark
                  ? "rgba(255,0,0,0.12)"
                  : "rgba(255,0,0,0.08)",
                borderRadius: 16,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 13,
                  color: textPrimary,
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isBusy}
              activeOpacity={0.9}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
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
                {phase === "success" ? "Done" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={phase !== "confirm"}
              activeOpacity={0.9}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  phase !== "confirm"
                    ? isDark
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(0,0,0,0.18)"
                    : isDark
                      ? "#FFFFFF"
                      : "#1F2937",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                  color:
                    phase !== "confirm"
                      ? isDark
                        ? "rgba(0,0,0,0.55)"
                        : "rgba(255,255,255,0.65)"
                      : isDark
                        ? "#000"
                        : "#fff",
                }}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Category Picker Overlay */}
      {categoryPickerVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={onCategoryPickerClose}
            style={{ flex: 1 }}
          />
          <View
            style={{
              backgroundColor: bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 24,
              maxHeight: "70%",
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingBottom: 10,
              }}
            >
              <View style={{ width: 24 }} />
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 16,
                  color: textPrimary,
                }}
              >
                Pick a category
              </Text>
              <TouchableOpacity onPress={onCategoryPickerClose} hitSlop={10}>
                <X size={22} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor: isDark ? "#2C2C2C" : "#E5E7EB",
                alignSelf: "center",
                marginBottom: 12,
              }}
            />

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {allCategories.map((c) => {
                const style = getCategoryStyle(c, customCategories, draft?.type === "income");
                const isSelected =
                  draft?.category && String(draft.category).toLowerCase() === c.toLowerCase();

                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      if (onCategoryPick) {
                        onCategoryPick(c);
                      } else {
                        onChangeDraft({ ...safeDraft, category: c });
                        if (onCategoryPickerClose) {
                          onCategoryPickerClose();
                        }
                      }
                    }}
                    activeOpacity={0.9}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 16,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? isDark
                          ? "rgba(255,255,255,0.22)"
                          : "rgba(0,0,0,0.18)"
                        : isDark
                          ? "rgba(255,255,255,0.10)"
                          : "rgba(0,0,0,0.08)",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)",
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: style.accent,
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{style.icon}</Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 15,
                        color: textPrimary,
                        flex: 1,
                      }}
                    >
                      {c}
                    </Text>
                    {isSelected ? (
                      <Text
                        style={{
                          fontFamily: "Roboto_400Regular",
                          fontSize: 12,
                          color: textSecondary,
                        }}
                      >
                        Selected
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}
