import React from "react";
import { Text, View } from "react-native";
import roomStyles from "../../styles/chat/ChatRoom.module";

export default function DateDivider({ label }: { label: string }) {
  return (
    <View style={roomStyles.dateRow}>
      <View style={roomStyles.dateLine} />
      <Text style={roomStyles.dateLabel}>{label}</Text>
      <View style={roomStyles.dateLine} />
    </View>
  );
}
