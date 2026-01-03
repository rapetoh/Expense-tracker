import { create } from "zustand";

// Web / unsupported runtime stub.
// This prevents Metro from trying to bundle native RevenueCat modules on web.
export const PREMIUM_ENTITLEMENT_ID = "premium";

const usePremiumStore = create((set) => ({
  isPremium: false,
  isReady: true,
  lastError: null,
  setState: (partial) => set(partial),
}));

export function usePremium() {
  return usePremiumStore();
}

export async function initPurchases() {
  // No purchases on web preview.
  usePremiumStore.getState().setState({
    isPremium: false,
    isReady: true,
    lastError: null,
  });
}

export async function refreshPremium() {
  usePremiumStore.getState().setState({
    isPremium: false,
    isReady: true,
    lastError: null,
  });
}

export async function presentPremiumPaywall() {
  return {
    success: false,
    result: "UNAVAILABLE",
    error: "Purchases are not available in the web preview.",
  };
}
