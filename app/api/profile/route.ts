import { NextResponse } from 'next/server';
import { authorizeApiRequest, withAvatarUrl } from '@/lib/apiAuth';

export async function GET() {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;
  return NextResponse.json(auth.profile);
}

export async function PUT(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || Array.from(name).length > 255) {
    return NextResponse.json({ error: 'ชื่อต้องมีความยาว 1-255 ตัวอักษร' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', auth.user.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auth.supabase.auth.updateUser({
    data: { ...auth.user.user_metadata, name },
  });

  return NextResponse.json(withAvatarUrl(data));
}
