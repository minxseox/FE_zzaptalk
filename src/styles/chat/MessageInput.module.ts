import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#EDEDED",
    backgroundColor: "#fff",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F3F3F5",
    borderRadius: 22,
    minHeight: 46,
    justifyContent: "center",
  },
  input: {
    paddingLeft: 14,
    paddingRight: 56,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  sendFab: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -19 }],
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#8F86FF",
    alignItems: "center",
    justifyContent: "center",
  },
});
