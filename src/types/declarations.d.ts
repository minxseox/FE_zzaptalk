// src/declarations.d.ts

// React Native의 .module 스타일 파일을 StyleSheet 객체로 인식시킴
declare module "*.module" {
  import { StyleSheet } from "react-native";
  const styles: ReturnType<typeof StyleSheet.create>;
  export default styles;
}
