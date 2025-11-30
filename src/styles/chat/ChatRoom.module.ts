import { Platform, StyleSheet } from "react-native";

const PURPLE = "#9997FF";
const FAIL_RED = "#E34B4B";

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

  // ✅ 연속 메시지일 때 아바타 자리 유지용
  avatarSpacer: { width: 34, marginRight: 8 },

  bubbleLine: { flexDirection: "row", alignItems: "flex-end", maxWidth: "88%" },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: "100%",
  },
  bubbleMine: { backgroundColor: PURPLE, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: "#EFEFEF", borderBottomLeftRadius: 6 },
  failWrap: {
    marginLeft: 6,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  failText: {
    fontSize: 11,
    color: "#FF3B30",
    fontWeight: "600",
  },
  senderName: { fontSize: 12, color: "#666", marginBottom: 4 },
  msgTextMine: { color: "#fff", fontSize: 15, lineHeight: 21 },
  msgTextOther: { color: "#111", fontSize: 15, lineHeight: 21 },

  timeBeside: { fontSize: 11, color: "#8E8E8E", alignSelf: "flex-end" },
  // ✅ 너 요구대로: 내 시간은 왼쪽 아래, 상대는 오른쪽 아래 느낌
  timeMine: { textAlign: "left", marginRight: 4 },
  timeOther: { textAlign: "right", marginLeft: 4 },

  // ✅ 실패 아이콘(카톡 느낌)
  failIconBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFE8E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6, // 말풍선 바로 왼쪽
  },
  failIcon: {
    fontSize: 12,
    color: FAIL_RED,
    fontWeight: "900",
    lineHeight: 12,
  },

  // ✅ 전송중/재전송 영역
  statusRow: {
    marginTop: 4,
    flexDirection: "row",
  },
  statusRowMine: {
    justifyContent: "flex-end",
  },
  resendBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFE7EA",
  },
  resendText: {
    fontSize: 12,
    color: FAIL_RED,
    fontWeight: "700",
  },
  sendingText: {
    fontSize: 12,
    color: "#9A9AA3",
  },

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

    // ✅ 포커스 박스(특히 web outline) 제거
    ...(Platform.OS === "web"
      ? ({
          outlineStyle: "none",
          outlineWidth: 0,
          boxShadow: "none",
        } as any)
      : null),
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
