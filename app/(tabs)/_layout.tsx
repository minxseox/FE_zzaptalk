import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#7B61FF",
        tabBarInactiveTintColor: "#B8B8D2",
        tabBarStyle: {
          height: 56,
          borderTopColor: "#E0E0E0",
          borderTopWidth: 1,
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Tabs.Screen
        name="friends/index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* 🔥 chat → chatlist 로 변경 */}
      <Tabs.Screen
        name="chatlist/index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
