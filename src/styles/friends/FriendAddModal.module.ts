// src/styles/friends/FriendAddModal.module.ts
import { StyleSheet } from "react-native";

const PURPLE = "#7C73FF";

export default StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "88%",
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: "#F2F2F6",
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  tabTextActive: {
    color: PURPLE,
    fontWeight: "700",
  },
  inputWrap: {
    marginTop: 4,
    marginBottom: 14,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E2EA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  button: {
    minWidth: 70,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: "#F3F3F7",
  },
  confirmButton: {
    backgroundColor: PURPLE,
  },
  cancelText: {
    fontSize: 13,
    color: "#555",
  },
  confirmText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
});
