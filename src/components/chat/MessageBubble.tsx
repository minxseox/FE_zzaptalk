import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatRoomStyles } from "../../styles/chat/ChatRoom.module";

type Props = {
  mine: boolean;
  content: string;
  senderName?: string | null;
  showName: boolean;

  // avatar
  showAvatar: boolean;
  onPressAvatar?: () => void;

  // time
  timeLabel?: string;
  showTime: boolean;

  // ✅ send status
  failed?: boolean;
  onRetry?: () => void;
};

export default function MessageBubble({
  mine,
  content,
  senderName,
  showName,
  showAvatar,
  onPressAvatar,
  timeLabel = "",
  showTime,
  failed = false,
  onRetry,
}: Props) {
  return (
    <View
      style={[
        chatRoomStyles.msgRow,
        mine ? chatRoomStyles.msgRowMine : chatRoomStyles.msgRowOther,
      ]}
    >
      {!mine ? (
        showAvatar ? (
          <Pressable
            style={chatRoomStyles.avatarContainer}
            onPress={onPressAvatar}
          >
            <View style={chatRoomStyles.avatarPlaceholder}>
              <Text style={chatRoomStyles.avatarInitial}>
                {senderName?.charAt(0) ?? "?"}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={chatRoomStyles.avatarSpacer} />
        )
      ) : null}

      <View style={chatRoomStyles.bubbleLine}>
        {/* ✅ 내 시간: 말풍선 왼쪽 아래 */}
        {mine && showTime ? (
          <Text style={[chatRoomStyles.timeBeside, chatRoomStyles.timeMine]}>
            {timeLabel}
          </Text>
        ) : null}

        <View
          style={[
            chatRoomStyles.bubble,
            mine ? chatRoomStyles.bubbleMine : chatRoomStyles.bubbleOther,
          ]}
        >
          {showName && !mine && senderName ? (
            <Text style={chatRoomStyles.senderName}>{senderName}</Text>
          ) : null}

          <Text
            style={
              mine ? chatRoomStyles.msgTextMine : chatRoomStyles.msgTextOther
            }
          >
            {content}
          </Text>
        </View>

        {/* ✅ 상대 시간: 말풍선 오른쪽 아래 */}
        {!mine && showTime ? (
          <Text style={[chatRoomStyles.timeBeside, chatRoomStyles.timeOther]}>
            {timeLabel}
          </Text>
        ) : null}

        {/* ✅ 카톡 느낌 실패 UI: 내 메시지 실패일 때만 */}
        {mine && failed ? (
          <Pressable
            onPress={onRetry}
            style={chatRoomStyles.failWrap}
            hitSlop={8}
          >
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={chatRoomStyles.failText}>다시 보내기</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
