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
  // ✅ 웹에서 Enter키 처리 (Shift+Enter는 줄바꿈, 그냥 Enter는 전송)
  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (Platform.OS === "web") {
      // 🚨 수정 포인트: (e.nativeEvent as any).shiftKey 로 타입 우회
      if (e.nativeEvent.key === "Enter" && !(e.nativeEvent as any).shiftKey) {
        e.preventDefault(); // 줄바꿈 방지
        onSend();
      }
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
          style={[chatRoomStyles.input, { maxHeight: 100 }]} // 길어지면 스크롤
          // ✅ 채팅 핵심 설정 (여러 줄 입력)
          multiline={true}
          // ✅ 웹: Enter 키 감지
          onKeyPress={handleKeyPress}
          // ✅ 모바일: 키보드 '전송' 버튼 눌렀을 때
          onSubmitEditing={Platform.OS !== "web" ? onSend : undefined}
          // ✅ Android 텍스트 정렬 이슈 방지
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
