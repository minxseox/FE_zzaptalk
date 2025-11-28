// src/services/profile.ts
import { AxiosError } from "axios";
import { api, ApiError } from "../lib/api"; // api 인스턴스 & ApiError는 네가 쓰던 거 그대로
import type { Profile, UpdateProfileRequest } from "../types/profile";

/**
 * 내 프로필 조회
 * GET /api/v1/users/profile
 */
export async function fetchMyProfile(): Promise<Profile> {
  try {
    const res = await api.get<Profile>("/v1/users/profile");
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * 내 프로필 수정
 * PUT /api/v1/users/profile
 */
export async function updateMyProfile(
  body: UpdateProfileRequest
): Promise<Profile> {
  try {
    const res = await api.put<Profile>("/v1/users/profile", body);
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * (옵션) 친구 프로필 조회
 * GET /api/v1/friends/{friendId}/profile
 * 친구 프로필 화면 만들 때 쓰면 됨
 */
export async function fetchFriendProfile(friendId: number): Promise<Profile> {
  try {
    const res = await api.get<Profile>(`/v1/friends/${friendId}/profile`);
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}
