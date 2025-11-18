import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";

export default function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const go = (to: Href) => router.replace(to);
  const active = (p: string) => pathname.startsWith(p);

  return (
    <View
      style={{
        height: 56,
        borderTopWidth: 1,
        borderTopColor: "#EFEFEF",
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
      }}
    >
      <Pressable
        onPress={() => go("/friends" as Href)}
        style={{ alignItems: "center", justifyContent: "center", gap: 2 }}
      >
        <Ionicons
          name="person-outline"
          size={22}
          color={active("/friends") ? "#7C74FF" : "#8B8B8B"}
        />
        <Text
          style={{
            fontSize: 11,
            color: active("/friends") ? "#7C74FF" : "#8B8B8B",
            fontWeight: active("/friends") ? "700" : "500",
          }}
        >
          친구
        </Text>
      </Pressable>

      <Pressable
        onPress={() => go("/chatlist" as Href)}
        style={{ alignItems: "center", justifyContent: "center", gap: 2 }}
      >
        <Ionicons
          name="chatbubble-ellipses"
          size={22}
          color={active("/chatlist") ? "#7C74FF" : "#8B8B8B"}
        />
        <Text
          style={{
            fontSize: 11,
            color: active("/chatlist") ? "#7C74FF" : "#8B8B8B",
            fontWeight: active("/chatlist") ? "700" : "500",
          }}
        >
          채팅
        </Text>
      </Pressable>
    </View>
  );
}
