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

// ✅ 차단 타입 정의 (UI에서 import해서 쓸 수 있도록 export)
export type BlockType = "MESSAGE_ONLY" | "MESSAGE_AND_PROFILE" | "NONE";

/**
 * 친구 목록 조회
 * GET /api/v1/friends
 */
export async function getFriendList(): Promise<FriendListResponseDto> {
  try {
    const res = await api.get<FriendListResponseDto>("/v1/friends");
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * 친구 추가
 * POST /api/v1/friends
 */
export async function addFriend(payload: AddFriendPayload): Promise<string> {
  try {
    const res = await api.post<string>("/v1/friends", payload, {
      responseType: "text",
    });
    return typeof res.data === "string" ? res.data : String(res.data);
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * DELETE /api/v1/friends/{friendId}
 */
export async function deleteFriend(friendId: number): Promise<void> {
  if (!friendId && friendId !== 0) {
    throw new ApiError("삭제할 친구 ID가 없습니다.", 400, null);
  }
  try {
    await api.delete(`/v1/friends/${friendId}`);
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * GET /api/v1/friends/search?keyword=...
 */
export async function searchFriends(
  keyword: string
): Promise<FriendListResponseDto> {
  try {
    const res = await api.get<FriendListResponseDto>("/v1/friends/search", {
      params: { keyword },
    });
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * GET /api/v1/friends/{friendId}/profile
 */
export async function getFriendProfile(friendId: number): Promise<any> {
  try {
    const res = await api.get(`/v1/friends/${friendId}/profile`);
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * PUT /api/v1/friends
 */
export async function updateFriendSetting(payload: {
  friendId: number;
  isFavorite: boolean;
}): Promise<void> {
  try {
    await api.put("/v1/friends", payload);
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/*
 * POST /api/v1/friends/sync-contacts
 */
export async function syncContacts(contacts: any[]): Promise<void> {
  try {
    await api.post("/v1/friends/sync-contacts", { contacts });
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

// --- 그룹 관련 (기존 코드 유지) ---

/** 그룹 생성: POST /api/v1/friends/groups */
export async function createFriendGroup(
  body: CreateFriendGroupRequestDto
): Promise<FriendGroupResponseDto> {
  try {
    const res = await api.post<FriendGroupResponseDto>(
      "/v1/friends/groups",
      body
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 그룹 목록 조회: GET /api/v1/friends/groups */
export async function getFriendGroups(): Promise<FriendGroupResponseDto[]> {
  try {
    const res = await api.get<FriendGroupResponseDto[]>("/v1/friends/groups");
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 그룹에 친구 추가: POST /api/v1/friends/groups/members */
export async function addFriendToGroup(
  body: AddFriendToGroupRequestDto
): Promise<void> {
  try {
    await api.post("/v1/friends/groups/members", body);
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 그룹에서 친구 제거 */
export async function removeFriendFromGroup(
  groupId: number,
  friendshipId: number
): Promise<string | undefined> {
  try {
    const res = await api.delete<string>(
      `/v1/friends/groups/${groupId}/members/${friendshipId}`
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/** 그룹 삭제 */
export async function deleteFriendGroup(
  groupId: number
): Promise<string | undefined> {
  try {
    const res = await api.delete<string>(`/v1/friends/groups/${groupId}`);
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

// --- ✅ [추가] 친구 차단 관련 API ---

/**
 * 친구 차단
 * POST /api/v1/friends/block
 */
export async function blockFriend(
  blockedUserId: number,
  blockType: BlockType
): Promise<void> {
  try {
    await api.post("/v1/friends/block", {
      blockedUserId,
      blockType,
    });
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * 차단한 친구 목록 조회
 * GET /api/v1/friends/block
 */
export async function getBlockedFriends(): Promise<any[]> {
  try {
    // 응답 DTO가 명세되어 있지 않아 any[]로 처리했습니다.
    // 추후 차단 목록 데이터 구조가 확정되면 타입을 변경하세요.
    const res = await api.get<any[]>("/v1/friends/block");
    return res.data;
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}

/**
 * 차단 설정 변경 (해제 포함)
 * PUT /api/v1/friends/block
 */
export async function updateBlockFriend(
  blockedUserId: number,
  blockType: BlockType
): Promise<void> {
  try {
    await api.put("/v1/friends/block", {
      blockedUserId,
      blockType,
    });
  } catch (err) {
    const e = err as AxiosError;
    throw new ApiError(e.message, e.response?.status ?? 500, e.response?.data);
  }
}
