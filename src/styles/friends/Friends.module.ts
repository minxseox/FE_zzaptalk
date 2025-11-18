// src/styles/friends/Friends.module.ts
import { StyleSheet } from "react-native";

const PURPLE = "#7C73FF";

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
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
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8F0",
    borderTopWidth: 2,
    borderTopColor: PURPLE, // 화면 최상단 보라색 라인
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },
  headerRight: {
    width: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerIcon: {
    marginLeft: 10,
    color: "#111111",
  },

  // 내 프로필
  myProfileSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#ffffff",
  },
  myProfileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DDDDDD",
    marginBottom: 8,
  },
  myProfileName: {
    fontSize: 13,
    color: "#333333",
  },

  // 구분선
  divider: {
    height: 1,
    backgroundColor: "#E8E8F0",
  },

  // 친구 수
  friendCountRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  friendCountLabel: {
    fontSize: 11,
    color: "#8C8C8C",
  },
  friendCountValue: {
    marginTop: 2,
    fontSize: 11,
    color: "#555555",
  },

  // 친구 리스트
  friendList: {
    // 위아래 여백 약간만
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F5",
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFEFF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  friendAvatarInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  friendName: {
    fontSize: 14,
    color: "#111111",
  },
});
