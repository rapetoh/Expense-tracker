import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { getAllCategories, getAllIncomeCategories, getCategoryStyle } from "@/utils/categories";
import useDeviceId from "@/utils/useDeviceId";
import { useCustomCategories } from "@/utils/queries";
import { useTheme } from "@/utils/theme";

export default function CategoryPickerModal({
  visible,
  onClose,
  onPick,
  selected,
  isIncome = false, // Whether to show income categories
}) {
  const { isDark } = useTheme();
  const deviceId = useDeviceId();
  const customCategoriesQuery = useCustomCategories({ deviceId });
  
  const customCategories = customCategoriesQuery.data?.categories || [];
  const allCategories = useMemo(() => {
    if (isIncome) {
      return getAllIncomeCategories();
    }
    return getAllCategories(customCategories);
  }, [isIncome, customCategories]);

  const bg = useMemo(() => (isDark ? "#121212" : "#fff"), [isDark]);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent 
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <View
          style={{
            backgroundColor: bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 24,
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
                color: isDark ? "#fff" : "#000",
              }}
            >
              Pick a category
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={22} color={isDark ? "#fff" : "#000"} />
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
              const style = getCategoryStyle(c, customCategories, isIncome);
              const isSelected =
                selected && String(selected).toLowerCase() === c.toLowerCase();

              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => onPick(c)}
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
                      color: isDark ? "#fff" : "#000",
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
                        color: isDark ? "rgba(255,255,255,0.75)" : "#6B7280",
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
      </TouchableOpacity>
    </Modal>
  );
}
