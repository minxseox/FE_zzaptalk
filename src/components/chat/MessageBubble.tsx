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
  failed?: boolean;
  onPressFail?: () => void;
  // status (local)
  status?: "sent" | "sending" | "failed";
  onPressFail?: () => void;
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
  status = "sent",
  onPressFail,
}: Props) {
  const showFail = mine && status === "failed";

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
        {/* ✅ 내 시간: 말풍선 "왼쪽 아래" */}
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

        {/* ✅ 상대 시간: 말풍선 "오른쪽 아래" */}
        {!mine && showTime ? (
          <Text style={[chatRoomStyles.timeBeside, chatRoomStyles.timeOther]}>
            {timeLabel}
          </Text>
        ) : null}

        {/* ✅ 실패 아이콘(!)만 표시 → 누르면 액션시트 */}
        {showFail ? (
          <Pressable
            style={chatRoomStyles.failIconBtn}
            onPress={onPressFail}
            hitSlop={8}
          >
            <Ionicons name="alert-circle" size={18} color="#E34B4B" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
