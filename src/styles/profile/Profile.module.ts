// src/styles/profile/Profile.module.ts
import { StyleSheet } from "react-native";

const AVATAR_SIZE = 96;
const BACKGROUND_HEIGHT = 580;

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  inner: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* HEADER */
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
  },
  headerSideSpace: {
    width: 60,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#4D61FF",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  cancelText: {
    fontSize: 14,
    color: "#444",
  },

  /* BACKGROUND IMAGE */
  backgroundWrapper: {
    marginTop: 32,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E3E3E3",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0", // 배경 바로 아래 선
  },
  backgroundPlaceholder: {
    width: "100%",
    height: BACKGROUND_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImage: {
    width: "100%",
    height: BACKGROUND_HEIGHT,
  },
  backgroundPlaceholderText: {
    color: "#CFCFCF",
    fontSize: 15,
  },

  backgroundChangeButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffffdd",
    zIndex: 10, // 버튼 터치 항상 되게
  },
  backgroundChangeText: {
    fontSize: 12,
    marginLeft: 4,
  },

  /* BOTTOM CARD (공통) */
  bottomCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 60,
  },

  topDivider: {
    height: 1,
    backgroundColor: "#E3E3E3",
    marginBottom: 0,
  },

  /* 아바타 공통 */
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    // 배경 아래 선에서 약간(5px 정도) 떨어지게
    marginTop: -AVATAR_SIZE / 2 + 5,
    marginBottom: 24,
  },

  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.7,
    borderColor: "#D6D6D6",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },

  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },

  /* EDIT 모드 아바타 + 카메라 뱃지 */
  avatarEditWrapper: {
    position: "relative",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCameraBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 28,
    height: 28,
    borderRadius: 20,
    backgroundColor: "#4D61FF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* VIEW 모드 이름 */
  nameText: {
    marginLeft: 16,
    fontSize: 14,
    color: "#000",
    marginTop: 10, // 보기/편집 둘 다 비슷한 높이
  },

  /* EDIT 모드 이름 */
  nameEditContainer: {
    marginLeft: 16,
    flexDirection: "row",
    alignItems: "center",
    width: "65%",
    marginTop: 10,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
  },
  nameEditIcon: {
    marginLeft: 8,
    color: "#777",
  },

  /* VIEW 모드 상태 메시지 */
  statusContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  statusText: {
    fontSize: 13,
    color: "#D0D0D0",
  },

  /* EDIT 모드 상태 메시지 */
  statusLabel: {
    fontSize: 14,
    color: "#B3B3B3",
    marginBottom: 12,
    marginTop: 40,
    textAlign: "center",
  },

  statusInputRow: {
    width: "70%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
    paddingBottom: 4,
  },
  statusInput: {
    flex: 1,
    fontSize: 16,
    textAlign: "center",
  },
  statusEditIcon: {
    marginLeft: 8,
    color: "#777",
  },
});
