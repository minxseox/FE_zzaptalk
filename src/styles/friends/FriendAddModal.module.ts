// src/styles/friends/FriendAddModal.module.ts
import { StyleSheet } from "react-native";

const PURPLE = "#9997FF";

export default StyleSheet.create({
  // ✅ [수정] overlay -> modalOverlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ✅ [수정] sheet -> modalContainer
  modalContainer: {
    width: "85%", // 너비 조정
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 24, // 상하 패딩 넉넉하게
    alignItems: "stretch", // 내부 요소 가로 꽉 차게
  },

  // ✅ [수정] sheetTitle -> modalTitle
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
    textAlign: "center",
  },

  // 탭 영역
  tabRow: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "#F2F2F6",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  tabTextActive: {
    color: PURPLE,
    fontWeight: "700",
  },

  // 입력 필드
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E2EA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    marginBottom: 24, // 버튼과 간격
  },

  // 버튼 영역
  buttonRow: {
    flexDirection: "row",
    gap: 10, // 버튼 사이 간격
  },

  // ✅ [수정] button + cancelButton 합침 -> cancelButton
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F3F7",
    alignItems: "center",
    justifyContent: "center",
  },
  // ✅ [수정] cancelText -> cancelButtonText
  cancelButtonText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
  },

  // ✅ [수정] button + confirmButton 합침 -> addButton
  addButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  // ✅ [수정] confirmText -> addButtonText
  addButtonText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
  },
});
