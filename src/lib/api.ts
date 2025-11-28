// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Platform } from "react-native";

// ... (ApiError 클래스는 기존 유지) ...
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** ===============================
 * BASE URL 설정 (완전 수정됨)
 * =============================== */
const getBaseUrl = () => {
  // 1. 환경변수가 있으면 무조건 최우선 (끝에 /api가 있다면 제거 로직 포함 가능)
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) {
    // 혹시라도 환경변수에 /api/ 처럼 슬래시가 중복될까봐 정리
    return envBase.replace(/\/+$/, "");
  }

  // 2. Web 환경: 환경변수가 없으면 '상대 경로' 사용
  // 이렇게 하면 http://localhost:3000/api 로 자동 매핑되어 CORS가 사라집니다.
  if (Platform.OS === "web") {
    return "/api";
  }

  // 3. 앱(Native) 환경: 상대 경로 불가. (개발용 IP 예시)
  // 앱에서는 localhost가 폰 자신이 되므로 컴퓨터 IP가 필요합니다.
  // 여기는 하드코딩보다는 .env를 꼭 설정하시기를 권장합니다.
  return "http://10.0.2.2:8080/api";
};

// ✅ 최종 BASE URL
export const BASE = getBaseUrl();

console.log(`[API] Platform: ${Platform.OS}, BASE: '${BASE}'`);

// ... (AUTH_TOKEN, setApiAuthToken 등 나머지 코드는 기존 유지) ...
let AUTH_TOKEN: string | null = null;

export function setApiAuthToken(token: string | null) {
  AUTH_TOKEN = token;
  if (token) {
    (api.defaults.headers as any).common["Authorization"] = `Bearer ${token}`;
  } else {
    delete (api.defaults.headers as any).common["Authorization"];
  }
}

export function clearApiAuthToken() {
  setApiAuthToken(null);
}

// ... (Axios 인스턴스 생성) ...
export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ✅ 쿠키/세션 공유를 위해 필수
});

// ... (나머지 인터셉터 및 get/post 함수들은 기존 코드 그대로 사용) ...
// (기존 코드 생략 - 변경 없음)
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

api.interceptors.request.use((config) => {
  const headers = axios.AxiosHeaders.from(config.headers);
  config.headers = headers;
  if (config.skipAuth) return config;
  if (AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data as any;
      const msg =
        (typeof data === "string" && data) ||
        data?.message ||
        data?.error ||
        data?.msg ||
        `HTTP ${status}`;
      return Promise.reject(new ApiError(msg, status, data));
    }
    if (err.request) {
      return Promise.reject(
        new ApiError("네트워크 오류 또는 서버 응답 없음", 0, null)
      );
    }
    return Promise.reject(
      new ApiError(err.message || "알 수 없는 오류", -1, null)
    );
  }
);

export async function get<T>(
  url: string,
  params?: any,
  cfg?: AxiosRequestConfig
) {
  const { data } = await api.get<T>(url, { params, ...(cfg || {}) });
  return data;
}
export async function post<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
) {
  const { data } = await api.post<T>(url, body, cfg);
  return data;
}
export async function put<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
) {
  const { data } = await api.put<T>(url, body, cfg);
  return data;
}
export async function del<T>(url: string, cfg?: AxiosRequestConfig) {
  const { data } = await api.delete<T>(url, cfg);
  return data;
}
export async function postText(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
) {
  const res = await api.post(url, body, {
    responseType: "text",
    transformResponse: (v) => v,
    ...(cfg || {}),
  });
  return res.data as string;
}
