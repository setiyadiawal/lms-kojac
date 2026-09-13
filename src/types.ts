export type AppRole = 'founder' | 'co_founder' | 'administrator' | 'pengajar' | 'siswa' | 'umum';

export interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: 'id' | 'en' | 'ja';
  is_approved: boolean;
  is_blocked: boolean;
}

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
}
