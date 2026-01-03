import { Platform } from "react-native";
import { create } from "zustand";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

// IMPORTANT:
// - RevenueCat entitlement id must match what you configured in RevenueCat.
// - Default is "premium". If your project uses "pro", change it here.
export const PREMIUM_ENTITLEMENT_ID = "premium";

function getRevenueCatApiKey() {
  // On Anything, this is already available as an env var.
  // This must be the *public* RevenueCat SDK key for iOS.
  return process.env.REVENUE_CAT_API_KEY;
}

const usePremiumStore = create((set) => ({
  isPremium: false,
  isReady: false,
  lastError: null,
  setState: (partial) => set(partial),
}));

export function usePremium() {
  return usePremiumStore();
}

export async function initPurchases({ deviceId }) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    usePremiumStore.getState().setState({
      isPremium: false,
      isReady: true,
      lastError: "Missing RevenueCat API key",
    });
    return;
  }

  try {
    Purchases.setLogLevel(
      process.env.NODE_ENV === "production" ? LOG_LEVEL.ERROR : LOG_LEVEL.INFO,
    );

    // Configure only on native platforms.
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      usePremiumStore.getState().setState({
        isPremium: false,
        isReady: true,
        lastError: null,
      });
      return;
    }

    // Tie purchases to your per-device identity (since this MVP runs without sign-in).
    Purchases.configure({ apiKey, appUserID: deviceId || undefined });

    await refreshPremium();
  } catch (e) {
    console.error(e);
    usePremiumStore.getState().setState({
      isPremium: false,
      isReady: true,
      lastError: e instanceof Error ? e.message : "Could not init purchases",
    });
  }
}

export async function refreshPremium() {
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];

    usePremiumStore.getState().setState({
      isPremium: !!ent,
      isReady: true,
      lastError: null,
    });
  } catch (e) {
    console.error(e);
    usePremiumStore.getState().setState({
      isPremium: false,
      isReady: true,
      lastError: e instanceof Error ? e.message : "Could not fetch purchases",
    });
  }
}

export async function presentPremiumPaywall() {
  try {
    const result = await RevenueCatUI.presentPaywall();

    const success =
      result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;

    // Always refresh after paywall closes.
    await refreshPremium();

    return { success, result };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      result: PAYWALL_RESULT.ERROR,
      error: e instanceof Error ? e.message : "Paywall error",
    };
  }
}
