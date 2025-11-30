import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatRoomStyles } from "../../styles/chat/ChatRoom.module";

type Props = {
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onHeight?: (h: number) => void;
};

export default function MessageInput({
  text,
  setText,
  onSend,
  inputRef,
  onHeight,
}: Props) {
  return (
    <View
      style={chatRoomStyles.inputBar}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
    >
      <Pressable style={chatRoomStyles.circleBtn}>
        <Ionicons name="add" size={20} color="#444" />
      </Pressable>
      <Pressable style={chatRoomStyles.circleBtn}>
        <Ionicons name="happy-outline" size={20} color="#444" />
      </Pressable>

      <View style={chatRoomStyles.inputWrap}>
        <TextInput
          ref={inputRef}
          placeholder="메세지 입력"
          value={text}
          onChangeText={setText}
          style={chatRoomStyles.input}
          onSubmitEditing={onSend}
          returnKeyType="send"
          underlineColorAndroid="transparent"
        />
        <Pressable
          style={[
            chatRoomStyles.sendFab,
            !text.trim() && { backgroundColor: "#D8D8E8" },
          ]}
          onPress={onSend}
          disabled={!text.trim()}
        >
          <Ionicons name="paper-plane" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
