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

  msgRow: {
    flexDirection: "row",
    marginVertical: 6,
    paddingHorizontal: 6,
    // ✅ RN Web: 부모 폭 계산 꼬일 때 대비
    minWidth: 0,
  },
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
  avatarSpacer: { width: 34, marginRight: 8 },

  // ✅ 여기 중요: RN Web에서 maxWidth/%만 두면 폭 0되는 케이스가 있어서 flexShrink 추가
  bubbleLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "88%",
    flexShrink: 1,
    minWidth: 0,
  },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: "100%",
    flexShrink: 1,
    minWidth: 0,
  },
  bubbleMine: { backgroundColor: PURPLE, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: "#EFEFEF", borderBottomLeftRadius: 6 },

  senderName: { fontSize: 12, color: "#666", marginBottom: 4 },
  msgTextMine: { color: "#fff", fontSize: 15, lineHeight: 21 },
  msgTextOther: { color: "#111", fontSize: 15, lineHeight: 21 },

  timeBeside: { fontSize: 11, color: "#8E8E8E", alignSelf: "flex-end" },
  timeMine: { textAlign: "left", marginRight: 4 },
  timeOther: { textAlign: "right", marginLeft: 4 },

  failIconBtn: {
    marginLeft: 6,
    alignSelf: "flex-end",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  failIcon: {
    fontSize: 12,
    color: FAIL_RED,
    fontWeight: "900",
    lineHeight: 12,
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
    minWidth: 0,
  },
  input: {
    paddingLeft: 14,
    paddingRight: 54,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    maxHeight: 120,

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

  searchOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  searchPanel: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  searchBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchInputWrap: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F2F2F5",
    paddingHorizontal: 12,
    justifyContent: "center",
    minWidth: 0,
  },
  searchInput: { fontSize: 14, color: "#111", paddingVertical: 0 },
  searchResultWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  searchResultTitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
    marginBottom: 8,
  },
  searchEmpty: { fontSize: 13, color: "#777", paddingVertical: 12 },

  searchRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
  },
  searchRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  searchRowName: { fontSize: 12, color: "#555", fontWeight: "700" },
  searchRowTime: { fontSize: 11, color: "#888" },
  searchRowMsg: { fontSize: 14, color: "#111" },
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
