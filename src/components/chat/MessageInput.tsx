// MessageInput.tsx
import React, { useState } from "react"; // ✅ useState 추가
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
  // ✅ 1. 한글 입력(조합) 상태 관리
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (Platform.OS !== "web") return;

    const ne: any = e.nativeEvent; // ✅ shiftKey / preventDefault 우회

    // ✅ 2. !isComposing 조건 추가: 한글 조합 중이 아닐 때만 전송
    if (ne?.key === "Enter" && !ne?.shiftKey && !isComposing) {
      // ✅ 줄바꿈 방지
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
          // ✅ 3. 웹 환경(React Native Web)에서 Composition 이벤트 바인딩
          // React Native 타입 정의에는 없지만, 웹에서는 정상 동작하므로 ts-ignore 처리
          // @ts-ignore
          onCompositionStart={() => setIsComposing(true)}
          // @ts-ignore
          onCompositionEnd={() => setIsComposing(false)}
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
