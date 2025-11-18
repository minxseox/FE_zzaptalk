import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 88,
    rowGap: 6,
  },

  // 날짜 구분
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
    columnGap: 12,
    paddingHorizontal: 16,
  },
  dateLine: { height: 1, backgroundColor: "#e9ecef", flex: 1 },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  dateLabel: { color: "#6c7280", fontSize: 12, fontWeight: "600" },

  // 헤더는 ChatHeader.module 사용
});
