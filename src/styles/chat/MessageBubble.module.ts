import { StyleSheet, Platform } from "react-native";

const PURPLE = "#C9C8FF";
const GRAY = "#EDEFF2";
const TIME = "#9BA1A6";

export default StyleSheet.create({
  wrap: { marginBottom: 10 },
  wrapMine: { alignItems: "flex-end" },
  wrapOther: { alignItems: "flex-start" },

  name: { fontSize: 12, color: "#1b1b1b", fontWeight: "600", marginBottom: 6 },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "100%",
    ...(Platform.OS === "web" ? ({ overflowX: "visible" } as any) : {}),
  },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexShrink: 0,
    ...(Platform.OS === "web"
      ? ({
          display: "inline-flex",
          width: "fit-content",
          maxWidth: "calc(100vw - 120px)",
          overflowX: "auto",
          overflowY: "hidden",
        } as any)
      : {}),
  },
  myBubble: {
    backgroundColor: PURPLE,
    borderBottomRightRadius: 8,
    marginLeft: 6,
  },
  otherBubble: {
    backgroundColor: GRAY,
    borderBottomLeftRadius: 8,
    marginRight: 6,
  },

  text: {
    fontSize: 15,
    color: "#1b1b1b",
    lineHeight: 22,
    ...(Platform.OS === "web"
      ? ({
          whiteSpace: "nowrap",
          wordBreak: "keep-all",
          display: "inline",
        } as any)
      : {}),
  },

  time: { fontSize: 11, color: TIME },
  timeMine: { alignSelf: "flex-end", marginRight: 6, marginTop: 4 },
  timeOther: { alignSelf: "flex-end", marginTop: 4 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D9D9D9",
    marginRight: 8,
  },
  content: { maxWidth: "78%" },
});
