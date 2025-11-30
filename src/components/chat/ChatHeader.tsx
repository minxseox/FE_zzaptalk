import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatRoomStyles } from "../../styles/chat/ChatRoom.module";

type Props = {
  title: string;
  syncing?: boolean;
  onBack: () => void;
  onPressSearch?: () => void;
  onPressMenu?: () => void;
};

export default function ChatHeader({
  title,
  syncing = false,
  onBack,
  onPressSearch,
  onPressMenu,
}: Props) {
  return (
    <View style={chatRoomStyles.header}>
      <Pressable onPress={onBack} style={chatRoomStyles.headerBtn}>
        <Ionicons name="chevron-back" size={22} color="#111" />
      </Pressable>

      <Text style={chatRoomStyles.headerTitle}>{title}</Text>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          style={chatRoomStyles.headerBtn}
          onPress={onPressSearch}
          disabled={!onPressSearch}
        >
          <Ionicons name="search" size={20} color="#111" />
        </Pressable>

        <Pressable
          style={chatRoomStyles.headerBtn}
          onPress={onPressMenu}
          disabled={!onPressMenu}
        >
          <Ionicons
            name="menu"
            size={22}
            color="#111"
            style={{ opacity: syncing ? 0.6 : 1 }}
          />
        </Pressable>
      </View>
    </View>
  );
}
