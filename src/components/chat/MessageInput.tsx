// MessageInput.tsx
import React from "react";
import {
  Pressable,
  TextInput,
  View,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
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
  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (Platform.OS !== "web") return;

    const ne: any = e.nativeEvent; // ✅ shiftKey / preventDefault 우회
    if (ne?.key === "Enter" && !ne?.shiftKey) {
      // ✅ 줄바꿈 방지: preventDefault는 web에서만 있을 수도 있어서 optional 처리
      ne.preventDefault?.();
      (e as any).preventDefault?.();

      // ✅ 혹시 이미 \n 이 들어가버린 경우 제거(안전장치)
      setText(text.replace(/\n$/, ""));

      onSend();
    }
  };

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
          style={[chatRoomStyles.input, { maxHeight: 100 }]}
          multiline
          onKeyPress={handleKeyPress}
          onSubmitEditing={Platform.OS !== "web" ? onSend : undefined}
          blurOnSubmit={false}
          textAlignVertical="center"
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
