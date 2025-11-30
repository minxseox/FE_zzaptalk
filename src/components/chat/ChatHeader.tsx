import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatRoomStyles } from "../../styles/chat/ChatRoom.module";

type Props = {
  title: string;
  syncing?: boolean;
  onBack: () => void;
};

export default function ChatHeader({ title, syncing = false, onBack }: Props) {
  return (
    <View style={chatRoomStyles.header}>
      <Pressable onPress={onBack} style={chatRoomStyles.headerBtn}>
        <Ionicons name="chevron-back" size={22} color="#111" />
      </Pressable>

      <Text style={chatRoomStyles.headerTitle}>{title}</Text>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable style={chatRoomStyles.headerBtn}>
          <Ionicons name="search" size={20} color="#111" />
        </Pressable>
        <Pressable style={chatRoomStyles.headerBtn}>
          <Ionicons
            name="settings-outline"
            size={20}
            color="#111"
            style={{ opacity: syncing ? 0.6 : 1 }}
          />
        </Pressable>
      </View>
    </View>
  );
}
