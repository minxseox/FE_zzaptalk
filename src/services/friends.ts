// src/services/friends.ts
import { api, ApiError } from "../lib/api";
import { AxiosError } from "axios";
import type {
  FriendListResponseDto,
  AddFriendPayload,
  FriendGroupResponseDto,
  CreateFriendGroupRequestDto,
  AddFriendToGroupRequestDto,
} from "../types/friends";

/**
 * 친구 목록 조회
 * GET /api/v1/friends
 */
export async function getFriendList(): Promise<FriendListResponseDto> {
  const res = await api.get<FriendListResponseDto>("/api/v1/friends");
  return res.data;
}

/**
 * 친구 추가
 * POST /api/v1/friends
 * body: { identifier, type: "PHONE" | "ZZAPID" }
 */
export async function addFriend(payload: AddFriendPayload): Promise<string> {
  const res = await api.post<string>("/api/v1/friends", payload, {
    responseType: "text",
  });
  return typeof res.data === "string" ? res.data : String(res.data);
}

/** 친구 삭제: DELETE /api/v1/friends/{friendId} */
export async function deleteFriend(friendId: number): Promise<void> {
  if (!friendId && friendId !== 0) {
    throw new ApiError("삭제할 친구 ID가 없습니다.", 400, null);
  }

  try {
    await api.delete(`/api/v1/friends/${friendId}`);
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 🔹 그룹 생성: POST /api/v1/friends/groups */
export async function createFriendGroup(
  body: CreateFriendGroupRequestDto
): Promise<FriendGroupResponseDto> {
  try {
    const res = await api.post<FriendGroupResponseDto>(
      "/api/v1/friends/groups",
      body
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 🔹 그룹 목록 조회: GET /api/v1/friends/groups */
export async function getFriendGroups(): Promise<FriendGroupResponseDto[]> {
  try {
    const res = await api.get<FriendGroupResponseDto[]>(
      "/api/v1/friends/groups"
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 🔹 그룹에 친구 추가: POST /api/v1/friends/groups/members */
export async function addFriendToGroup(
  body: AddFriendToGroupRequestDto
): Promise<void> {
  try {
    await api.post("/api/v1/friends/groups/members", body);
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 🔹 그룹에서 친구 제거: DELETE /api/v1/friends/groups/{groupId}/members/{friendshipId} */
export async function removeFriendFromGroup(
  groupId: number,
  friendshipId: number
): Promise<string | undefined> {
  try {
    const res = await api.delete<string>(
      `/api/v1/friends/groups/${groupId}/members/${friendshipId}`
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 🔹 그룹 삭제: DELETE /api/v1/friends/groups/{groupId} */
export async function deleteFriendGroup(
  groupId: number
): Promise<string | undefined> {
  try {
    const res = await api.delete<string>(`/api/v1/friends/groups/${groupId}`);
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}
