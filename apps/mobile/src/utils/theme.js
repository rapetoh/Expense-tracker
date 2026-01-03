import { useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "@expense_tracker_theme";

// Theme options
export const THEME_OPTIONS = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
};

// Global theme state
let globalThemePreference = THEME_OPTIONS.SYSTEM;
let globalListeners = new Set();

// Load initial theme preference
(async () => {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved && Object.values(THEME_OPTIONS).includes(saved)) {
      globalThemePreference = saved;
      // Notify all listeners
      globalListeners.forEach((listener) => listener(globalThemePreference));
    }
  } catch (e) {
    console.error("Could not load theme preference:", e);
  }
})();

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState(
    globalThemePreference,
  );

  useEffect(() => {
    const listener = (newPreference) => {
      setThemePreferenceState(newPreference);
    };

    globalListeners.add(listener);

    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  const setThemePreference = async (newTheme) => {
    try {
      globalThemePreference = newTheme;
      await AsyncStorage.setItem(THEME_KEY, newTheme);

      // Notify all listeners
      globalListeners.forEach((listener) => listener(newTheme));
    } catch (e) {
      console.error("Could not save theme preference:", e);
    }
  };

  // Determine the actual color scheme to use
  const colorScheme =
    themePreference === THEME_OPTIONS.SYSTEM
      ? systemColorScheme
      : themePreference;

  const isDark = colorScheme === "dark";

  return {
    themePreference,
    setThemePreference,
    colorScheme,
    isDark,
    systemColorScheme,
  };
}
