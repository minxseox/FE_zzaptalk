// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Platform } from "react-native";

// ... (ApiError 클래스는 그대로 유지) ...
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
 * BASE URL 설정 (수정됨)
 * =============================== */
const getBaseUrl = () => {
  // ✅ 환경변수에서 혹시라도 끝에 붙은 /api를 제거합니다.
  const envBase = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/api\/?$/, "");

  // 📌 Native(iOS/Android)
  if (Platform.OS === "ios" || Platform.OS === "android") {
    if (envBase) return envBase;
    return "https://api.zzaptalk.com";
  }

  // 📌 Web(Docker 빌드 포함)
  if (Platform.OS === "web") {
    if (envBase) return envBase;

    let host = "";
    if (typeof window !== "undefined") host = window.location.hostname;

    // 2순위: 도커 + Nginx 환경 (localhost 등)
    if (host === "localhost" || host === "127.0.0.1") {
      // ✅ [핵심] 여기서 ""를 리턴해야 요청이 /chat/...으로 나가고
      // Nginx가 location /chat (혹은 location /) 설정을 따르게 됩니다.
      // 만약 Nginx가 location /api를 기다린다면, 여기서 ""를 리턴하고
      // chat.ts에는 /chat 만 있어도 Nginx 설정(Rewrite)에 따라 작동할 수 있습니다.
      return "";
    }

    // 3순위: 배포된 웹
    // ✅ 여기도 끝에 /api를 붙이지 않습니다.
    return "https://api.zzaptalk.com";
  }

  return "https://api.zzaptalk.com";
};

// ✅ 최종적으로 한 번 더 슬래시 제거
export const BASE = getBaseUrl().replace(/\/+$/, "");

console.log(`[API] Platform: ${Platform.OS}, BASE: '${BASE}'`);

// ... (AUTH_TOKEN, setApiAuthToken 등 나머지 코드는 그대로 유지) ...
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

// ... (Axios 인스턴스 생성 유지) ...
export const api = axios.create({
  baseURL: BASE || undefined, // BASE가 ""이면 undefined로 처리되어 상대경로 사용
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ... (나머지 interceptor, get, post 함수들은 모두 그대로 유지) ...

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
