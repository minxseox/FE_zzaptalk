import React from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatRoomStyles } from "../../styles/chat/ChatRoom.module";

type Props = {
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  inputRef: React.RefObject<TextInput | null>;
  onHeight?: (h: number) => void;
};

export default function MessageInput({
  text,
  setText,
  onSend,
  inputRef,
  onHeight,
}: Props) {
  // ✅ RN Web 포커스(파란 박스) 제거용 스타일 (TS 타입 때문에 any 캐스팅)
  const webNoOutline =
    Platform.OS === "web"
      ? ({
          outlineStyle: "none",
          outlineWidth: 0,
          boxShadow: "none",
        } as any)
      : null;

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
          style={[chatRoomStyles.input, webNoOutline]}
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
