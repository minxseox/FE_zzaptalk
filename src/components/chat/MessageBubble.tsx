import React from "react";
import { Pressable, Text, View } from "react-native";
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
      </View>
    </View>
  );
}
