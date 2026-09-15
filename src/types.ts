export type AppRole =
  | 'umum'
  | 'siswa'
  | 'pengajar'
  | 'staff'
  | 'administrator'
  | 'manager'
  | 'co_founder'
  | 'founder';

export const APP_ROLE_RANK: Record<AppRole, number> = {
  umum: 0,
  siswa: 1,
  pengajar: 2,
  staff: 3,
  administrator: 4,
  manager: 5,
  co_founder: 6,
  founder: 7,
};

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  umum: 'Umum',
  siswa: 'Siswa',
  pengajar: 'Pengajar',
  staff: 'Staff',
  administrator: 'Admin',
  manager: 'Manager',
  co_founder: 'Co-Founder',
  founder: 'Founder',
};

export const USER_MANAGEMENT_ROLES: AppRole[] = [
  'administrator',
  'manager',
  'co_founder',
  'founder',
];

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
