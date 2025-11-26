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
 * ★ BASE URL 설정 (수정 완료)
 * - 1순위: 환경변수 (.env)
 * - 2순위: 웹일 경우 Nginx Proxy (/api)
 * - 3순위: 앱일 경우 실서버 주소 (기본값)
 * =============================== */
const getBaseUrl = () => {
  // 1. 환경 변수가 있으면 무조건 최우선으로 사용합니다.
  // (로컬 개발 시 내 PC IP를 .env에 적으면 여기서 걸립니다.)
  if (process.env.EXPO_PUBLIC_API_BASE) {
    return process.env.EXPO_PUBLIC_API_BASE;
  }

  // 2. 환경 변수가 없고 + 웹(Web) 환경일 때
  // Docker/Nginx 환경에서는 '/api' 상대 경로를 사용해야 프록시가 작동합니다.
  if (Platform.OS === "web") {
    return "/api";
  }

  // 3. 환경 변수가 없고 + 앱(App) 환경일 때
  // 백엔드 개발자 요청대로 "배포 주소"를 기본값으로 설정합니다.
  return "https://api.zzaptalk.com";
};

export const BASE = getBaseUrl().replace(/\/+$/, "");

console.log(`[API] Environment: ${Platform.OS}, Base URL: ${BASE}`);

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
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/** ===============================
 * 커스텀 필드 확장 (skipAuth)
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

  if (config.skipAuth) {
    console.log("[REQ]", config.method?.toUpperCase(), config.url, "skipAuth");
    return config;
  }

  if (AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }

  const hasAuth = headers.get("Authorization") ? "auth✓" : "auth✗";
  console.log("[REQ]", config.method?.toUpperCase(), config.url, hasAuth);

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

      console.warn(
        "[RES ERR]",
        status,
        err.config?.method?.toUpperCase(),
        err.config?.url,
        msg
      );

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
 * 공통 요청 메서드
 * =============================== */
export async function get<T>(
  url: string,
  params?: any,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.get<T>(url, { params, ...(cfg || {}) });
  return data;
}

export async function post<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.post<T>(url, body, cfg);
  return data;
}

export async function put<T>(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.put<T>(url, body, cfg);
  return data;
}

export async function del<T>(
  url: string,
  cfg?: AxiosRequestConfig
): Promise<T> {
  const { data } = await api.delete<T>(url, cfg);
  return data;
}

export async function postText(
  url: string,
  body?: any,
  cfg?: AxiosRequestConfig
): Promise<string> {
  const res = await api.post(url, body, {
    responseType: "text",
    transformResponse: (v) => v,
    ...(cfg || {}),
  });
  return res.data as string;
}
