export type AppRole = 'admin' | 'shop_owner' | 'seller';

export interface AppProfile {
  id: string;
  username: string;
  name: string;
  role: AppRole;
  avatar_path?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  shop_owner: 'Shop Owner',
  seller: 'Seller',
};

export const isManagerRole = (role: AppRole) => role === 'admin' || role === 'shop_owner';
