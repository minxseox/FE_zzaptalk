import React, { memo } from "react";
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

  // status (local)
  status?: "sent" | "sending" | "failed";
  onPressFail?: () => void;
};

function MessageBubble({
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
                {(senderName ?? "?").charAt(0)}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={chatRoomStyles.avatarSpacer} />
        )
      ) : null}

      <View style={chatRoomStyles.bubbleLine}>
        {/* 내 시간: 말풍선 왼쪽 아래 */}
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
            selectable
          >
            {content}
          </Text>
        </View>

        {/* 상대 시간: 말풍선 오른쪽 아래 */}
        {!mine && showTime ? (
          <Text style={[chatRoomStyles.timeBeside, chatRoomStyles.timeOther]}>
            {timeLabel}
          </Text>
        ) : null}

        {/* 실패 아이콘 */}
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

/**
 * ✅ RN Web에서 FlatList virtualization + useCallback 조합이면
 * "보내졌는데 화면이 갱신 안 된 것처럼" 보이는 케이스가 나올 수 있어서
 * memo를 쓰되, 비교를 명시적으로 해줌.
 */
export default memo(MessageBubble, (a, b) => {
  return (
    a.mine === b.mine &&
    a.content === b.content &&
    a.senderName === b.senderName &&
    a.showName === b.showName &&
    a.showAvatar === b.showAvatar &&
    a.timeLabel === b.timeLabel &&
    a.showTime === b.showTime &&
    a.status === b.status
  );
});
