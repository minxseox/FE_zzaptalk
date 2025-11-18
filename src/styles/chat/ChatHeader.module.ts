import { StyleSheet } from "react-native";

export default StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f3f5",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { maxWidth: 220, fontSize: 18, fontWeight: "700", color: "#242424" },
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
