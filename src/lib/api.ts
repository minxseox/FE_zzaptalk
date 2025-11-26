// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Platform } from "react-native";

/** ===============================
 * 커스텀 에러 클래스
 * =============================== */
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
 * BASE URL 설정 (최종 완성본)
 * =============================== */
const getBaseUrl = () => {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;

  // 📌 Native(iOS/Android)
  if (Platform.OS === "ios" || Platform.OS === "android") {
    if (envBase) return envBase;
    return "https://api.zzaptalk.com"; // Fallback
  }

  // 📌 Web(Docker 빌드 포함)
  if (Platform.OS === "web") {
    // 1순위: EXPO_PUBLIC_API_BASE가 있다면 사용
    if (envBase) return envBase;

    let host = "";
    if (typeof window !== "undefined") host = window.location.hostname;

    // 2순위: 도커 + Nginx 환경 (localhost에서 서비스됨)
    if (host === "localhost" || host === "127.0.0.1") {
      return ""; // ★ /api 를 그대로 쓰기 위해 빈 문자열
    }

    // 3순위: 배포된 웹
    return "https://api.zzaptalk.com";
  }

  // 기본값
  return "https://api.zzaptalk.com";
};

export const BASE = getBaseUrl().replace(/\/+$/, "");

console.log(`[API] Platform: ${Platform.OS}, BASE: '${BASE}'`);

/** ===============================
 * 전역 토큰 캐시
 * =============================== */
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

/** ===============================
 * Axios 인스턴스
 * =============================== */
export const api = axios.create({
  baseURL: BASE || undefined,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/** ===============================
 * skipAuth 타입 확장
 * =============================== */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

/** ===============================
 * 요청 인터셉터
 * =============================== */
api.interceptors.request.use((config) => {
  const headers = axios.AxiosHeaders.from(config.headers);
  config.headers = headers;

  if (config.skipAuth) return config;

  if (AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }

  return config;
});

/** ===============================
 * 응답 인터셉터
 * =============================== */
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

/** ===============================
 * HTTP 메서드 래퍼
 * =============================== */
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
