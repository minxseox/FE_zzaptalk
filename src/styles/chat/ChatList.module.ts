// src/styles/chat/ChatList.module.ts
import { StyleSheet } from "react-native";

const PURPLE = "#7C73FF";

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  // 상단 헤더
  header: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: PURPLE, // 맨 위 보라 라인
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8F0",
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerIcon: {
    color: "#111111",
  },
  headerPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPlusIcon: {
    color: "#ffffff",
  },

  // 로딩
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // 채팅방 리스트
  roomList: {},
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: "#ffffff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F5",
  },
  roomAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFEFF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  roomAvatarInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
  },
  roomName: {
    fontSize: 14,
    color: "#111111",
  },

  /* ============================
   *    채팅방 생성 바텀시트
   * ============================ */

  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.25)", // 위 스샷처럼 회색 딤
  },
  sheetBackdropTouchable: {
    flex: 1, // 위 회색 영역 (누르면 닫힘)
  },
  sheetContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // 탭 버튼
  sheetTabRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  sheetTab: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTabActive: {
    backgroundColor: "#EFE9FF", // 연보라
  },
  sheetTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555555",
  },
  sheetTabTextActive: {
    fontWeight: "700",
    color: "#111111",
  },

  sheetBody: {
    marginTop: 4,
  },
  sheetLabel: {
    fontSize: 12,
    color: "#8C8C8C",
    marginBottom: 8,
  },
  sheetInputWrap: {
    borderRadius: 14,
    backgroundColor: "#F6F7F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  sheetInput: {
    fontSize: 14,
    color: "#111111",
  },

  sheetPrimaryBtn: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: PURPLE,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
