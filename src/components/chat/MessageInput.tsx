import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  NativeSyntheticEvent,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import styles from "../../styles/chat/MessageInput.module";

// 웹 키 이벤트: 조합중 여부/키코드까지 확장
type WebKeyEvent = NativeSyntheticEvent<
  { key: string } & {
    shiftKey?: boolean;
    isComposing?: boolean;
    keyCode?: number;
  }
>;

export default function MessageInput({
  onSend,
}: {
  onSend: (t: string) => void;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const handleKeyPress = (e: WebKeyEvent) => {
    if (Platform.OS !== "web") return;

    const ne: any = e.nativeEvent;

    // ✅ 한글 등 IME 조합 중 엔터는 무시
    if (ne?.isComposing || ne?.keyCode === 229) return;

    // ✅ 엔터로 전송, Shift+Enter는 줄바꿈
    if (ne?.key === "Enter" && !ne?.shiftKey) {
      e.preventDefault?.();
      submit();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.circleBtn}>
        <Ionicons name="add" size={22} color="#222" />
      </Pressable>

      <Pressable style={styles.circleBtn}>
        <Feather name="smile" size={20} color="#111" />
      </Pressable>

      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          style={styles.input}
          placeholder="메세지 입력"
          placeholderTextColor="#b5b5b5"
          multiline
          onKeyPress={handleKeyPress}
          // 웹 힌트(선택): 엔터키에 "전송" 표시
          // @ts-ignore  (react-native-web 전용 속성)
          enterKeyHint="send"
          blurOnSubmit={false}
        />
        <Pressable style={styles.sendFab} onPress={submit}>
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
