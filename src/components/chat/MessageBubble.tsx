import React from "react";
import { Image, Text, View } from "react-native";
import styles from "../../styles/chat/MessageBubble.module";

export type ChatMessage = {
  id: string;
  sender: "me" | "other";
  text: string;
  createdAt: Date;
  /** 그룹일 때 상대 이름(내 메시지에는 보통 없음) */
  otherName?: string;
  /** 그룹일 때 상대 아바타 URL */
  avatarUri?: string;
};

const fmtTime = (d: Date) => {
  const m = `${d.getMinutes()}`.padStart(2, "0");
  const h24 = d.getHours();
  const ampm = h24 < 12 ? "오전" : "오후";
  const h = h24 % 12 || 12;
  return `${ampm} ${h}:${m}`;
};

export default function MessageBubble({
  message,
  showTime = true,
  /** 그룹 모드 여부 (기본: false → 1:1 동작) */
  isGroup = false,
  /** 그룹에서 이름 보일지 (기본: false) */
  showName = false,
  /** 그룹에서 아바타 보일지 (기본: false) */
  showAvatar = false,
}: {
  message: ChatMessage;
  showTime?: boolean;
  isGroup?: boolean;
  showName?: boolean;
  showAvatar?: boolean;
}) {
  const mine = message.sender === "me";

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapOther]}>
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        {/* 그룹 & 상대 메시지일 때만 아바타 표시 */}
        {!mine && isGroup && showAvatar ? (
          message.avatarUri ? (
            <Image source={{ uri: message.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar} />
          )
        ) : null}

        {/* 본문 영역 최대폭 제한용 래퍼 */}
        <View style={styles.content}>
          {/* 그룹 & 상대 메시지일 때만 이름 표시 */}
          {!mine && isGroup && showName && !!message.otherName && (
            <Text style={styles.name} numberOfLines={1}>
              {message.otherName}
            </Text>
          )}

          {/* 가로 배치: 내 메시지는 [시간, 버블], 상대는 [버블, 시간] */}
          <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
            {mine && showTime ? (
              <Text style={[styles.time, styles.timeMine]}>
                {fmtTime(message.createdAt)}
              </Text>
            ) : null}

            <View
              style={[
                styles.bubble,
                mine ? styles.myBubble : styles.otherBubble,
              ]}
            >
              <Text style={styles.text}>{message.text}</Text>
            </View>

            {!mine && showTime ? (
              <Text style={[styles.time, styles.timeOther]}>
                {fmtTime(message.createdAt)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
