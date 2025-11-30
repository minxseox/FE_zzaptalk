// src/styles/chat/ChatRoom.module.ts
import { StyleSheet } from "react-native";

const PURPLE = "#9997FF";

export const chatRoomStyles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },

  dateSeparator: { alignItems: "center", marginVertical: 16 },
  dateSeparatorText: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  msgRow: { flexDirection: "row", marginVertical: 6, paddingHorizontal: 6 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },

  avatarContainer: { marginRight: 8, alignSelf: "flex-start" },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 14, color: "#666", fontWeight: "600" },

  // ✅ 시간 + 말풍선 라인 (카톡처럼 아래 정렬)
  bubbleLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "88%",
  },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: "100%",
  },
  bubbleMine: { backgroundColor: PURPLE, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: "#EFEFEF", borderBottomLeftRadius: 6 },
  senderName: { fontSize: 12, color: "#666", marginBottom: 4 },
  msgTextMine: { color: "#fff", fontSize: 15, lineHeight: 21 },
  msgTextOther: { color: "#111", fontSize: 15, lineHeight: 21 },

  // ✅ 말풍선 옆 시간(작게, 아래)
  timeBeside: {
    fontSize: 11,
    color: "#8E8E8E",
    lineHeight: 14,
    paddingBottom: 2, // ✅ 아래쪽으로 살짝 붙는 느낌
  },
  // 내 말풍선은 오른쪽에 있으니 시간은 "말풍선 왼쪽"
  timeBesideMine: { textAlign: "left", marginRight: 6 },
  // 상대 말풍선은 왼쪽에 있으니 시간은 "말풍선 오른쪽"
  timeBesideOther: { textAlign: "right", marginLeft: 6 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E9E9EC",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F3F3F7",
    borderRadius: 22,
    minHeight: 44,
    justifyContent: "center",
  },
  input: {
    paddingLeft: 14,
    paddingRight: 54,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    maxHeight: 120,
  },
  sendFab: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
});

export const chatRoomModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 300,
    height: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  bgContainer: { height: 120, width: "100%", position: "relative" },
  bgImage: { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: { flex: 1, alignItems: "center", marginTop: -40 },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    backgroundColor: "#fff",
    marginBottom: 10,
    elevation: 2,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 40 },
  name: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 4 },
  status: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  actionRow: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
  },
  actionItem: {
    flex: 1,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
