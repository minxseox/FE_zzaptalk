// src/types/friends.ts

export type FriendSummaryDto = {
  userId: number;
  nickname: string;
  profilePhotoUrl?: string | null;
  statusMessage?: string | null;
  birthday?: string | null; // "YYYY-MM-DD"
  isFavorite: boolean;
  customGroupName?: string | null;
};

export type FriendGroupDto = {
  groupName: string;
  friends: FriendSummaryDto[];
};

export type FriendListResponseDto = {
  birthdayFriends: FriendSummaryDto[]; // 오늘 ±7일
  favoriteFriends: FriendSummaryDto[];
  customGroups: FriendGroupDto[];
  otherFriends: FriendSummaryDto[];
};

export type AddFriendPayload = {
  identifier: string; // 전화번호 or zzapID
  type: "PHONE" | "ZZAPID"; // 정확히 이 두 값만
};
