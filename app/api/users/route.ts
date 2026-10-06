import { NextResponse } from 'next/server';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { authorizeApiRequest, MANAGER_ROLES, withAvatarUrl } from '@/lib/apiAuth';
import { isValidUsername, normalizeUsername } from '@/lib/authShared';
import type { AppProfile, AppRole } from '@/types/auth';

const roles = new Set<AppRole>(['admin', 'shop_owner', 'seller']);

async function edgeFunctionErrorResponse(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status || 500;
    let detail = '';
    try {
      const payload = await error.context.json() as { error?: string; message?: string };
      detail = payload.error || payload.message || '';
    } catch {
      // The function gateway does not always return a JSON body.
    }

    if (status === 404) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ deploy Supabase Edge Function ชื่อ manage-users' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: detail || error.message }, { status });
  }

  if (error instanceof FunctionsRelayError) {
    return NextResponse.json({ error: `Supabase Edge Function relay error: ${error.message}` }, { status: 502 });
  }
  if (error instanceof FunctionsFetchError) {
    return NextResponse.json({ error: `ไม่สามารถเชื่อมต่อ Supabase Edge Function: ${error.message}` }, { status: 503 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'เรียก Supabase Edge Function ไม่สำเร็จ' },
    { status: 500 },
  );
}

export async function GET() {
  const auth = await authorizeApiRequest(MANAGER_ROLES);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return edgeFunctionErrorResponse(error);
  return NextResponse.json((data || []).map((profile) => withAvatarUrl(profile as AppProfile)));
}

export async function POST(request: Request) {
  const auth = await authorizeApiRequest(MANAGER_ROLES);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const username = normalizeUsername(String(body.username || ''));
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const role = body.role as AppRole;

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: 'Username ต้องมี 3-50 ตัว และใช้ a-z, 0-9, จุด, _ หรือ -' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
  }
  if (!name || Array.from(name).length > 255 || !roles.has(role)) {
    return NextResponse.json({ error: 'ข้อมูลชื่อหรือ role ไม่ถูกต้อง' }, { status: 400 });
  }

  const { data, error } = await auth.supabase.functions.invoke('manage-users', {
    body: { action: 'create', username, password, name, role },
  });
  if (error) return edgeFunctionErrorResponse(error);
  if (data?.error) return NextResponse.json({ error: data.error }, { status: data.status || 400 });
  return NextResponse.json(withAvatarUrl(data.profile as AppProfile), { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await authorizeApiRequest(MANAGER_ROLES);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const id = String(body.id || '');
  const name = String(body.name || '').trim();
  const role = body.role as AppRole;
  const isActive = body.is_active !== false;
  const password = typeof body.password === 'string' ? body.password : '';

  if (!id || !name || Array.from(name).length > 255 || !roles.has(role)) {
    return NextResponse.json({ error: 'ข้อมูลผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
  }
  if (id === auth.user.id && !isActive) {
    return NextResponse.json({ error: 'ไม่สามารถปิดบัญชีที่กำลังใช้งานอยู่' }, { status: 400 });
  }

  const { data, error } = await auth.supabase.functions.invoke('manage-users', {
    body: { action: 'update', id, name, role, is_active: isActive, password: password || undefined },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data?.error) return NextResponse.json({ error: data.error }, { status: data.status || 400 });
  return NextResponse.json(withAvatarUrl(data.profile as AppProfile));
}
