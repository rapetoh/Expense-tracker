import { Tabs } from "expo-router";
import { Home, Grid3X3, BarChart3, User } from "lucide-react-native";
import { useTheme } from "@/utils/theme";

export default function TabLayout() {
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#1E1E1E" : "#FAFAFA",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#2C2C2C" : "#E5E7EB",
        },
        tabBarActiveTintColor: isDark ? "#ffffff" : "#000000",
        tabBarInactiveTintColor: isDark ? "#8A8A8A" : "#8E8E93",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      {/* Expo Router: folder index routes are referenced by the folder name (not "folder/index"). */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grid"
        options={{
          title: "Grid",
          tabBarIcon: ({ color }) => <Grid3X3 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
