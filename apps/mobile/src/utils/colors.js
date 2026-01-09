// Centralized color palette for consistent theming
export function getColors(isDark) {
  if (isDark) {
    return {
      // Backgrounds
      background: "#121212",
      secondaryBackground: "#1E1E1E",
      cardBackground: "rgba(255,255,255,0.06)",
      
      // Text
      textPrimary: "#FFFFFF",
      textSecondary: "rgba(255,255,255,0.7)",
      textTertiary: "rgba(255,255,255,0.5)",
      
      // Borders & Dividers
      border: "rgba(255,255,255,0.10)",
      borderLight: "rgba(255,255,255,0.08)",
      
      // Charts
      chartBar: "#BFD4FF",
      progressBar: "#CBFACF",
      
      // Buttons
      buttonPrimary: "#FFFFFF",
      buttonPrimaryText: "#000000",
      buttonHover: "rgba(255,255,255,0.9)",
      
      // Inputs
      inputBackground: "rgba(255,255,255,0.06)",
      inputBorder: "rgba(255,255,255,0.10)",
      inputPlaceholder: "rgba(255,255,255,0.35)",
    };
  } else {
    // Light mode - refined palette
    return {
      // Backgrounds - off-white instead of pure white
      background: "#FAFAFA",
      secondaryBackground: "#F5F5F5",
      cardBackground: "#FFFFFF", // Pure white cards on off-white background
      
      // Text - softer black instead of pure black
      textPrimary: "#1A1A1A",
      textSecondary: "#4B5563",
      textTertiary: "#9CA3AF",
      
      // Borders & Dividers - slightly stronger for better definition
      border: "rgba(0,0,0,0.08)",
      borderLight: "rgba(0,0,0,0.06)",
      
      // Charts - friendly indigo instead of black
      chartBar: "#6366F1",
      progressBar: "#6366F1",
      
      // Buttons - softer dark instead of pure black
      buttonPrimary: "#1F2937",
      buttonPrimaryText: "#FFFFFF",
      buttonHover: "#111827",
      
      // Inputs - very light gray background
      inputBackground: "#F9FAFB",
      inputBorder: "rgba(0,0,0,0.12)",
      inputPlaceholder: "#9CA3AF",
    };
  }
}


