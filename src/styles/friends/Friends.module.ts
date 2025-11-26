// src/styles/friends/Friends.module.ts
import { StyleSheet } from "react-native";

const PURPLE = "#9997FF";

const styles = StyleSheet.create({
  // =========================================================
  // 기존 localStyles 내용을 여기로 옮겨왔습니다.
  // =========================================================

  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // --- Header ---
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerContainer: {
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    height: 56,
  },
  absoluteTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // 아이콘 간격
  },
  headerIcon: {
    padding: 4,
  },
  searchInput: {
    width: "60%",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#333",
  },

  // --- My Profile ---
  myProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  myProfileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 12,
  },
  myProfileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#F5F5F5",
    marginHorizontal: 16,
  },

  // --- Friend Count & Filter ---
  friendCountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  friendCountRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  friendCountLabel: {
    fontSize: 12,
    color: "#888",
  },
  friendCountValue: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },

  friendFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
    flexWrap: "wrap",
  },
  friendFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PURPLE,
    backgroundColor: "#FFFFFF",
  },
  friendFilterTabActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  friendFilterTabText: {
    fontSize: 13,
    color: PURPLE,
    fontWeight: "500",
  },
  friendFilterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  friendFilterPlusTab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // --- Friend List ---
  friendList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "#eee",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarInitial: {
    fontSize: 16,
    fontWeight: "600",
    color: "#888",
  },
  friendName: {
    fontSize: 15,
    color: "#333",
  },
  moreButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // --- Menus & Modals ---
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 250,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 15,
    color: "#444",
  },

  // --- Group Modal ---
  groupModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  groupModalBox: {
    width: "80%",
    maxHeight: "80%",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
  },
  groupModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  groupSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  groupItem: { paddingVertical: 6 },
  groupItemText: { fontSize: 14 },
  groupDivider: { height: 1, backgroundColor: "#EEE", marginVertical: 8 },
  groupNameInput: {
    borderWidth: 1,
    borderColor: "#E0E0FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  groupHintText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    marginBottom: 4,
  },
  groupFriendList: { maxHeight: 160, marginTop: 4, marginBottom: 8 },
  groupFriendItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  groupFriendItemSelected: { backgroundColor: "#ECE8FF" },
  groupFriendItemText: { fontSize: 13, color: "#333" },
  groupFriendItemTextSelected: { color: "#7B61FF", fontWeight: "600" },
  groupCreateButton: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#7B61FF",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCreateButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  groupModalClose: { marginTop: 10, alignSelf: "flex-end" },
  groupModalCloseText: { fontSize: 13, color: "#7B61FF" },

  // --- Settings Dropdown ---
  settingsOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  settingsDropdown: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 150,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: "#eee",
  },
  settingsItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsItemText: {
    fontSize: 15,
    color: "#333",
  },
});

export default styles;
