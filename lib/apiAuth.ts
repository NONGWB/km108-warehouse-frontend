import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { AppProfile, AppRole } from '@/types/auth';

const AVATAR_BUCKET = 'user-avatars';

type AuthorizedRequest = {
  ok: true;
  user: User;
  profile: AppProfile;
  supabase: SupabaseClient;
};

type UnauthorizedRequest = {
  ok: false;
  response: NextResponse;
};

export function withAvatarUrl(profile: AppProfile): AppProfile {
  if (!profile.avatar_path) return { ...profile, avatar_url: null };
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const encodedPath = profile.avatar_path.split('/').map(encodeURIComponent).join('/');
  const avatarUrl = `${baseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${encodedPath}`;
  return { ...profile, avatar_url: avatarUrl };
}

export async function authorizeApiRequest(
  allowedRoles?: readonly AppRole[],
): Promise<AuthorizedRequest | UnauthorizedRequest> {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  try {
    const { data, error } = await authClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data || !data.is_active) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'User account is inactive or unavailable' }, { status: 403 }),
      };
    }

    const profile = withAvatarUrl(data as AppProfile);
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Permission denied' }, { status: 403 }),
      };
    }

    return { ok: true, user, profile, supabase: authClient };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify permissions';
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 503 }),
    };
  }
}

export const MANAGER_ROLES = ['admin', 'shop_owner'] as const satisfies readonly AppRole[];
