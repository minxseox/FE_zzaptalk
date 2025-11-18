// src/styles/friends/Profile.module.ts
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* ---------- HEADER ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  headerSpacer: {
    width: 50,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },

  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#4B6BFB",
  },

  editButtonText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "500",
  },

  /* ---------- CONTENT ---------- */
  content: {
    flex: 1,
    alignItems: "center",
  },

  backgroundBox: {
    marginTop: 8,
    width: "90%",
    height: 360,
    borderRadius: 10,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
  },

  backgroundText: {
    color: "#C5C5C5",
    fontSize: 14,
  },

  /* ---------- PROFILE SECTION ---------- */
  profileSection: {
    marginTop: -40,
    alignItems: "center",
  },

  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",

    // 그림자 (iOS/Android 모두)
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  avatarIcon: {
    fontSize: 32,
    color: "#BDBDBD",
  },

  myName: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
  },

  statusMessage: {
    marginTop: 32,
    fontSize: 13,
    color: "#C5C5C5",
  },
});
