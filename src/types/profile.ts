// src/types/profile.ts
export type Profile = {
  userId: number;
  name: string;
  nickname: string;
  zzapID: string;
  profilePhotoUrl: string | null;
  backgroundPhotoUrl: string | null;
  statusMessage: string | null;
  birthday: string | null; // "YYYY-MM-DD"
};

// 수정 요청용 DTO (전부 선택값)
export type UpdateProfileRequest = {
  nickname?: string;
  statusMessage?: string;
  profilePhotoUrl?: string;
  backgroundPhotoUrl?: string;
};
