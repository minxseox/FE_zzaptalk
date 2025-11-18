// src/services/friends.ts
import { api } from "../lib/api";
import type { FriendListResponseDto, AddFriendPayload } from "../types/friends";

/**
 * 친구 목록 조회
 * GET /api/v1/friends
 * - Authorization: Bearer {JWT}  (api 인스턴스가 자동으로 붙여줌)
 */
export async function getFriendList(): Promise<FriendListResponseDto> {
  const res = await api.get<FriendListResponseDto>("/api/v1/friends");
  return res.data;
}

/**
 * 친구 추가
 * POST /api/v1/friends
 * body: { identifier, type: "PHONE" | "ZZAPID" }
 * - 성공: 201, "친구가 추가되었습니다."
 * - 실패: 400, 에러 메시지 문자열
 */
export async function addFriend(payload: AddFriendPayload): Promise<string> {
  const res = await api.post<string>("/api/v1/friends", payload, {
    responseType: "text", // 응답이 그냥 문자열이어서
  });

  // axios가 data를 string으로 주도록 보장
  return typeof res.data === "string" ? res.data : String(res.data);
}

/** 친구 삭제 */
export async function deleteFriend(friendId: number): Promise<void> {
  if (!friendId && friendId !== 0) {
    throw new ApiError("삭제할 친구 ID가 없습니다.", 400, null);
  }

  await del(`/api/v1/friends/${friendId}`);
}
