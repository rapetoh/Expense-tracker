import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  ActionSheetIOS,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { Plus, ScanLine } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import ScreenLayout from "@/components/ScreenLayout";
import WeeklyBudgetBar from "@/components/WeeklyBudgetBar";
import ExpenseCard from "@/components/ExpenseCard";
import EmptyState from "@/components/EmptyState";
import MagicVoiceButton from "@/components/MagicVoiceButton";
import VoiceCaptureModal from "@/components/VoiceCaptureModal";
import CategoryPickerModal from "@/components/CategoryPickerModal";
import PartnerCard from "@/components/PartnerCard";
import GlassPaywallModal from "@/components/GlassPaywallModal";

import useDeviceId from "@/utils/useDeviceId";
import { normalizeCategory } from "@/utils/categories";
import { resolveApiUrl } from "@/utils/api";
import { usePremium, presentPremiumPaywall } from "@/utils/premium";
import { useTheme } from "@/utils/theme";
import {
  useCreateExpense,
  useDeleteExpense,
  useDeviceSettings,
  useExpenses,
  useIncrementVoiceUsage,
  useParseExpenseFromText,
  useScanReceipt,
  useVoiceUsage,
  useWeeklyStats,
  useMonthlyStats,
} from "@/utils/queries";

export default function Home() {
  const router = useRouter();
  const { isDark } = useTheme();

  const deviceId = useDeviceId();
  const premium = usePremium();
  const isPremium = !!premium.isPremium;

  const [voiceVisible, setVoiceVisible] = useState(false);
  const [voicePhase, setVoicePhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [feedFilter, setFeedFilter] = useState("all"); // "all", "expense", "income"
  const [budgetCardIndex, setBudgetCardIndex] = useState(0); // 0 = Weekly, 1 = Monthly

  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const expensesQuery = useExpenses({ deviceId, limit: 50 });
  const weeklyQuery = useWeeklyStats({ deviceId });
  const monthlyQuery = useMonthlyStats({ deviceId });
  const settingsQuery = useDeviceSettings({ deviceId });
  const voiceUsageQuery = useVoiceUsage({ deviceId });
  const incrementVoiceUsage = useIncrementVoiceUsage({ deviceId });

  const currency = settingsQuery.data?.currency_code || "USD";

  const createExpense = useCreateExpense({ deviceId });
  const deleteExpense = useDeleteExpense({ deviceId });
  const parseExpense = useParseExpenseFromText({ deviceId });
  const scanReceipt = useScanReceipt({ deviceId });

  const onEdit = useCallback(
    (expense) => {
      router.push(`/edit-expense/${expense.id}`);
    },
    [router],
  );

  const weeklySpentCents = weeklyQuery.data?.spent_cents || 0;
  const weeklyBudgetCents = weeklyQuery.data?.budget_cents || 0;
  const weeklyIncomeCents = weeklyQuery.data?.income_cents || 0;
  const weeklyNetBalanceCents = weeklyQuery.data?.net_balance_cents || 0;

  const monthlySpentCents = monthlyQuery.data?.spent_cents || 0;
  const monthlyBudgetCents = monthlyQuery.data?.budget_cents || 0;
  const monthlyIncomeCents = monthlyQuery.data?.income_cents || 0;
  const monthlyNetBalanceCents = monthlyQuery.data?.net_balance_cents || 0;

  const screenWidth = useMemo(() => Dimensions.get("window").width, []);

  const bgSecondary = isDark ? "#1E1E1E" : "#F5F5F5";
  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";

  const openManualAdd = useCallback(() => {
    router.push("/add-expense");
  }, [router]);

  // Process the scanned image (shared function)
  const processScannedImage = useCallback(async (imageUri) => {
    if (!imageUri) return;

    // Show voice modal with processing state
    setVoiceVisible(true);
    setVoicePhase("processing");
    setVoiceError(null);
    setTranscript("");
    setDraft(null);

    try {
      // Scan receipt
      const parsed = await scanReceipt.mutateAsync({ imageUri });

      const nextDraft = {
        amount_cents: parsed?.amount_cents ?? null,
        vendor: parsed?.vendor ?? "",
        category: normalizeCategory(parsed?.category),
        note: parsed?.note ?? "",
        occurred_at: parsed?.occurred_at ?? new Date().toISOString(),
        type: parsed?.type || 'expense',
        is_recurring: parsed?.is_recurring ?? false,
        recurrence_frequency: parsed?.recurrence_frequency ?? null,
      };

      setDraft(nextDraft);
      setVoicePhase("confirm");
    } catch (e) {
      console.error("Receipt scan error:", e);
      setVoicePhase("error");
      setVoiceError(
        e?.message || "Could not scan receipt. Please try again."
      );
    }
  }, [scanReceipt]);

  const handleReceiptScan = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS - Use ActionSheetIOS
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
            cancelButtonIndex: 0,
          },
          async (buttonIndex) => {
            if (buttonIndex === 0) return; // Cancel
            
            let result;
            if (buttonIndex === 1) {
              // Take Photo
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  "Permission Required",
                  "Camera permission is needed to scan receipts."
                );
                return;
              }
              result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
            } else if (buttonIndex === 2) {
              // Choose from Gallery
              result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
            }
            
            if (!result || result.canceled || !result.assets || result.assets.length === 0) {
              return;
            }

            const imageUri = result.assets[0].uri;
            await processScannedImage(imageUri);
          }
        );
      } else {
        // Android - Use Alert
        Alert.alert(
          "Scan Receipt",
          "Choose an option",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Take Photo",
              onPress: async () => {
                try {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert(
                      "Permission Required",
                      "Camera permission is needed to scan receipts."
                    );
                    return;
                  }
                  const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  
                  if (result.canceled || !result.assets || result.assets.length === 0) {
                    return;
                  }

                  const imageUri = result.assets[0].uri;
                  await processScannedImage(imageUri);
                } catch (e) {
                  console.error("Camera error:", e);
                  Alert.alert("Error", "Could not open camera. Please try again.");
                }
              },
            },
            {
              text: "Choose from Gallery",
              onPress: async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  
                  if (result.canceled || !result.assets || result.assets.length === 0) {
                    return;
                  }

                  const imageUri = result.assets[0].uri;
                  await processScannedImage(imageUri);
                } catch (e) {
                  console.error("Gallery error:", e);
                  Alert.alert("Error", "Could not open gallery. Please try again.");
                }
              },
            },
          ]
        );
      }
    } catch (e) {
      console.error("Receipt scan setup error:", e);
      Alert.alert("Error", "Could not open image picker. Please try again.");
    }
  }, [processScannedImage]);

  const resetVoice = useCallback(() => {
    setVoiceError(null);
    setTranscript("");
    setDraft(null);
    setVoicePhase("idle");
  }, []);

  const closeVoice = useCallback(() => {
    setVoiceVisible(false);
    resetVoice();
  }, [resetVoice]);

  const startRecording = useCallback(async () => {
    try {
      // TEMPORARILY DISABLED FOR DEVELOPMENT - Voice limit check removed
      // --- Pre-gate before we even open the mic (better UX + avoids wasted effort) ---
      // const remaining = voiceUsageQuery.data?.remaining;
      // const hasUsage = typeof remaining === "number";
      // if (!isPremium && hasUsage && remaining <= 0) {
      //   setVoiceVisible(false);
      //   resetVoice();
      //   setPaywallVisible(true);
      //   return;
      // }

      setVoiceVisible(true);
      setVoiceError(null);
      setTranscript("");
      setDraft(null);

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setVoicePhase("error");
        setVoiceError("Mic permission is needed for voice logging.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setVoicePhase("listening");
      await Haptics.selectionAsync();
    } catch (e) {
      console.error(e);
      setVoicePhase("error");
      setVoiceError("Could not start recording.");
    }
  }, [isPremium, recorder, resetVoice, voiceUsageQuery.data?.remaining]);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const continuePaywall = useCallback(async () => {
    const res = await presentPremiumPaywall();
    setPaywallVisible(false);

    if (res?.success && Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {
        // ignore
      }
    }
  }, []);

  const openPaywall = useCallback(() => {
    setPaywallVisible(true);
  }, []);

  const stopAndProcess = useCallback(async () => {
    let reservedUsage = false;

    try {
      if (!recorderState.isRecording) {
        return;
      }

      await recorder.stop();
      setVoicePhase("processing");

      // Reset audio mode after recording stops (helps avoid weird iOS states)
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      } catch (e) {
        // non-fatal
        console.error(e);
      }

      const uri = recorder.uri;
      if (!uri) {
        setVoicePhase("error");
        setVoiceError("No audio captured. Try again.");
        return;
      }

      // Read recorded file into a Blob
      let audioBlob;
      try {
        // Small delay helps on iOS where the file can still be finalizing
        await new Promise((r) => setTimeout(r, 150));
        const fileRes = await fetch(uri);
        audioBlob = await fileRes.blob();
      } catch (blobErr) {
        console.error(blobErr);
        setVoicePhase("error");
        setVoiceError("Could not read the recorded audio file.");
        return;
      }

      const inferredName = String(uri).split("/").pop() || "voice.m4a";
      const ext = inferredName.includes(".")
        ? inferredName.split(".").pop().toLowerCase()
        : "m4a";

      const inferredMime =
        ext === "wav"
          ? "audio/wav"
          : ext === "caf"
            ? "audio/x-caf"
            : ext === "mp3"
              ? "audio/mpeg"
              : "audio/mp4";

      // Some runtimes return a Blob without a type; ensure it's set.
      const typedAudioBlob = new Blob([audioBlob], { type: inferredMime });

      if (!typedAudioBlob || typedAudioBlob.size === 0) {
        setVoicePhase("error");
        setVoiceError(
          "Your recording came back empty (0 bytes). Please try again. If it keeps happening, force-close Expo Go and reopen it.",
        );
        return;
      }

      // TEMPORARILY DISABLED FOR DEVELOPMENT - Paywall gating removed
      // --- Paywall gating ---
      // We reserve a usage slot BEFORE calling transcription/LLM to protect costs.
      // if (!isPremium) {
      //   const usageRes = await incrementVoiceUsage.mutateAsync({ delta: 1 });
      //   reservedUsage = !!usageRes?.allowed;
      //   if (!usageRes?.allowed) {
      //     // Close the voice modal and show the glass paywall.
      //     setVoiceVisible(false);
      //     resetVoice();
      //     setPaywallVisible(true);
      //     return;
      //   }
      //   // User is now premium (or restored). Continue.
      // }

      // --- Transcribe (via our backend, not directly from the phone) ---
      const transcribeUrl = resolveApiUrl("/api/ai/transcribe");

      const transcribeRes = await fetch(transcribeUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": inferredMime,
          ...(deviceId ? { "x-device-id": deviceId } : {}),
        },
        body: typedAudioBlob,
      });

      if (!transcribeRes.ok) {
        const errText = await transcribeRes.text().catch(() => "");
        throw new Error(
          `Transcription failed: ${transcribeRes.status} ${transcribeRes.statusText}${errText ? ` - ${errText.slice(0, 300)}` : ""}`,
        );
      }

      const transcribeJson = await transcribeRes.json().catch(() => null);
      const text = transcribeJson?.text ? String(transcribeJson.text) : "";

      setTranscript(text);

      if (!text.trim()) {
        throw new Error(
          "Transcription came back empty. Please try again (this is usually networking, not your voice).",
        );
      }

      // Parse via our backend (includes smart vendor→category memory)
      const parsed = await parseExpense.mutateAsync({ text });

      const nextDraft = {
        amount_cents: parsed?.amount_cents ?? null,
        vendor: parsed?.vendor ?? "",
        category: normalizeCategory(parsed?.category),
        note: parsed?.note ?? "",
        occurred_at: parsed?.occurred_at ?? new Date().toISOString(),
        type: parsed?.type || 'expense', // Include type from parsed response
        is_recurring: parsed?.is_recurring ?? false,
        recurrence_frequency: parsed?.recurrence_frequency ?? null,
      };

      setDraft(nextDraft);
      setVoicePhase("confirm");
      await Haptics.selectionAsync();
    } catch (e) {
      console.error(e);

        // TEMPORARILY DISABLED FOR DEVELOPMENT - Rollback removed
        // Best-effort rollback: if we reserved a usage slot and then failed,
        // give the user that slot back.
        // if (reservedUsage && !isPremium) {
        //   try {
        //     await incrementVoiceUsage.mutateAsync({ delta: -1 });
        //   } catch (rollbackErr) {
        //     console.error(rollbackErr);
        //   }
        // }

      setVoicePhase("error");
      setVoiceError(e instanceof Error ? e.message : "Could not process that.");
    }
  }, [
    deviceId,
    incrementVoiceUsage,
    isPremium,
    parseExpense,
    recorder,
    recorderState.isRecording,
    resetVoice,
  ]);

  const confirmVoice = useCallback(async () => {
    try {
      if (!draft) return;
      if (!Number.isFinite(draft.amount_cents) || draft.amount_cents <= 0) {
        setVoiceError("Add an amount (example: $12).");
        return;
      }

      setVoiceError(null);
      setVoicePhase("saving");

      await createExpense.mutateAsync({
        amount_cents: draft.amount_cents,
        vendor: draft.vendor || null,
        category: normalizeCategory(draft.category),
        note: draft.note || null,
        occurred_at: draft.occurred_at || new Date().toISOString(),
        type: draft.type || 'expense',
        is_recurring: draft.is_recurring === true,
        recurrence_frequency: draft.is_recurring === true && draft.recurrence_frequency ? draft.recurrence_frequency : null,
      });

      setVoicePhase("success");
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      // Auto-close after a beat
      setTimeout(() => {
        setVoiceVisible(false);
        resetVoice();
      }, 700);
    } catch (e) {
      console.error(e);
      setVoicePhase("error");
      setVoiceError("Could not save that expense.");
    }
  }, [createExpense, draft, resetVoice]);

  const onDelete = useCallback(
    (expense) => {
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
    },
    [deleteExpense],
  );

  const listItems = expensesQuery.data?.items || [];

  const feedItems = useMemo(() => {
    // Filter by type first
    let filtered = listItems;
    if (feedFilter === "expense") {
      filtered = listItems.filter((item) => item.type === "expense" || !item.type);
    } else if (feedFilter === "income") {
      filtered = listItems.filter((item) => item.type === "income");
    }

    if (isPremium) return filtered;

    const out = [];
    const interval = 6;

    for (let i = 0; i < filtered.length; i += 1) {
      out.push(filtered[i]);
      const isSlot = (i + 1) % interval === 0;
      if (isSlot) {
        out.push({ _type: "partner", id: `partner_${i}` });
      }
    }

    return out;
  }, [isPremium, listItems, feedFilter]);

  const filteredItemsCount = useMemo(() => {
    const actualItems = feedItems.filter((item) => !item._type || item._type !== "partner");
    return actualItems.length;
  }, [feedItems]);

  const voiceUsageLabel = useMemo(() => {
    if (isPremium) return "Premium: unlimited voice";
    const used = voiceUsageQuery.data?.used;
    const limit = voiceUsageQuery.data?.limit;
    if (!Number.isFinite(used) || !Number.isFinite(limit)) return null;
    return `Voice entries: ${used}/${limit}`;
  }, [isPremium, voiceUsageQuery.data?.limit, voiceUsageQuery.data?.used]);

  const voiceRemaining = voiceUsageQuery.data?.remaining;
  const showUpgradeNudge =
    !isPremium &&
    typeof voiceRemaining === "number" &&
    voiceRemaining > 0 &&
    voiceRemaining <= 2;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        // Increased threshold to avoid conflict with ScrollView - only trigger on strong swipes
        return isHorizontal && Math.abs(gesture.dx) > 100;
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx < -100) {
          router.push("/(tabs)/analytics");
        } else if (gesture.dx > 100) {
          router.push("/(tabs)/profile");
        }
      },
    }),
  ).current;

  const headerSubtitle = useMemo(() => {
    if (!deviceId) return "Loading…";
    return "Log spending in seconds";
  }, [deviceId]);

  return (
    <ScreenLayout variant="home">
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {/* Header */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 28,
                  color: textPrimary,
                }}
              >
                Home
              </Text>
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 14,
                  color: textSecondary,
                  marginTop: 2,
                }}
              >
                {headerSubtitle}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleReceiptScan}
                activeOpacity={0.85}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: bgSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <ScanLine size={20} color={textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openManualAdd}
                activeOpacity={0.85}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: bgSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <Plus size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Budget bar - Swipeable Weekly/Monthly */}
        <View style={{ paddingBottom: 14 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            onMomentumScrollEnd={(evt) => {
              const x = evt.nativeEvent.contentOffset.x;
              const next = Math.round(x / screenWidth);
              setBudgetCardIndex(next);
            }}
          >
            <View style={{ width: screenWidth, paddingHorizontal: 20 }}>
              <WeeklyBudgetBar
                spentCents={weeklySpentCents}
                budgetCents={weeklyBudgetCents}
                incomeCents={weeklyIncomeCents}
                netBalanceCents={weeklyNetBalanceCents}
                currency={currency}
                period="Weekly"
              />
            </View>
            <View style={{ width: screenWidth, paddingHorizontal: 20 }}>
              <WeeklyBudgetBar
                spentCents={monthlySpentCents}
                budgetCents={monthlyBudgetCents}
                incomeCents={monthlyIncomeCents}
                netBalanceCents={monthlyNetBalanceCents}
                currency={currency}
                period="Monthly"
              />
            </View>
          </ScrollView>

          {/* Pagination Dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            {[0, 1].map((i) => {
              const active = i === budgetCardIndex;
              return (
                <View
                  key={i}
                  style={{
                    width: active ? 18 : 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: active
                      ? isDark
                        ? "#fff"
                        : "#000"
                      : isDark
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(0,0,0,0.18)",
                  }}
                />
              );
            })}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              gap: 10,
              paddingHorizontal: 20,
            }}
          >
            {voiceUsageLabel ? (
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                }}
              >
                {voiceUsageLabel}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {showUpgradeNudge ? (
              <TouchableOpacity
                onPress={openPaywall}
                activeOpacity={0.9}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "#000",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(0,0,0,0.06)",
                }}
                accessibilityLabel="Upgrade to Premium"
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 12,
                    color: isDark ? "#fff" : "#fff",
                  }}
                >
                  Upgrade
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Feed */}
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 16,
                color: textPrimary,
              }}
            >
              Your feed
            </Text>

            {/* Filter buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 4,
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
                onPress={() => setFeedFilter("all")}
                activeOpacity={0.75}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor:
                    feedFilter === "all"
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
                      feedFilter === "all"
                        ? isDark
                          ? "#000"
                          : "#fff"
                        : textSecondary,
                  }}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFeedFilter("expense")}
                activeOpacity={0.75}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor:
                    feedFilter === "expense"
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
                      feedFilter === "expense"
                        ? isDark
                          ? "#000"
                          : "#fff"
                        : textSecondary,
                  }}
                >
                  Expenses
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFeedFilter("income")}
                activeOpacity={0.75}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor:
                    feedFilter === "income"
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
                      feedFilter === "income"
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
          </View>

          {expensesQuery.isLoading ? (
            <Text
              style={{ fontFamily: "Roboto_400Regular", color: textSecondary }}
            >
              Loading…
            </Text>
          ) : expensesQuery.error ? (
            <Text
              style={{ fontFamily: "Roboto_400Regular", color: textSecondary }}
            >
              Could not load your expenses.
            </Text>
          ) : filteredItemsCount === 0 ? (
            <EmptyState
              title={
                feedFilter === "expense"
                  ? "No expenses yet"
                  : feedFilter === "income"
                    ? "No income yet"
                    : "No entries yet"
              }
              description={
                feedFilter === "expense"
                  ? "Hold the mic button and say something like “Spent 12 bucks on coffee.”"
                  : feedFilter === "income"
                    ? "Hold the mic button and say something like “Received 500 from salary.”"
                    : "Hold the mic button to add an expense or income entry."
              }
            />
          ) : (
            <FlatList
              data={feedItems}
              scrollEnabled={true}
              keyExtractor={(item, index) => {
                const isPartner = item?._type === "partner";
                if (isPartner) {
                  return String(item?.id || `partner_${index}`);
                }
                return String(item?.id || `expense_${index}`);
              }}
              renderItem={({ item, index }) => {
                const isPartner = item?._type === "partner";
                if (isPartner) {
                  return <PartnerCard index={index} />;
                }

                // Skip rendering if item is invalid
                if (!item || typeof item !== 'object') {
                  return null;
                }

                return (
                  <ExpenseCard
                    expense={item}
                    currency={currency}
                    onPress={() => {}}
                    onEdit={item._optimistic ? undefined : () => onEdit(item)}
                    onDelete={
                      item._optimistic ? undefined : () => onDelete(item)
                    }
                  />
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 130 }}
            />
          )}
        </View>

        {/* Magic button */}
        <MagicVoiceButton
          isActive={voicePhase === "listening"}
          disabled={
            !deviceId ||
            createExpense.isPending ||
            parseExpense.isPending ||
            incrementVoiceUsage.isPending
          }
          onLongPress={startRecording}
          onPressOut={stopAndProcess}
        />

        {/* Voice Modal */}
        <VoiceCaptureModal
          visible={voiceVisible}
          phase={voicePhase}
          transcript={transcript}
          draft={draft}
          currency={currency}
          error={voiceError}
          onClose={closeVoice}
          onChangeDraft={setDraft}
          onOpenCategoryPicker={() => {
            // Show category picker as overlay inside voice modal
            setCategoryPickerVisible(true);
          }}
          onConfirm={confirmVoice}
          categoryPickerVisible={categoryPickerVisible}
          onCategoryPick={(c) => {
            setCategoryPickerVisible(false);
            setDraft((prev) => {
              if (!prev) return prev;
              return { ...prev, category: c };
            });
          }}
          onCategoryPickerClose={() => {
            setCategoryPickerVisible(false);
          }}
        />

        <GlassPaywallModal
          visible={paywallVisible}
          title="Premium"
          subtitle="You’ve used your 10 free voice entries this month. Upgrade for unlimited voice and an ad-free feed."
          onClose={closePaywall}
          onContinue={continuePaywall}
        />

        <CategoryPickerModal
          visible={categoryPickerVisible}
          selected={draft?.category}
          isIncome={draft?.type === "income"}
          onClose={() => {
            setCategoryPickerVisible(false);
          }}
          onPick={(c) => {
            setCategoryPickerVisible(false);
            setDraft((prev) => {
              if (!prev) return prev;
              return { ...prev, category: c };
            });
          }}
        />
      </View>
    </ScreenLayout>
  );
}
