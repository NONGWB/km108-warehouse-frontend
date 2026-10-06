import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorizeApiRequest, withAvatarUrl } from '@/lib/apiAuth';

const BUCKET_NAME = 'user-avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extensionFor(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB' }, { status: 400 });
  }

  const oldPath = auth.profile.avatar_path;
  const newPath = `${auth.user.id}/${randomUUID()}.${extensionFor(file.type)}`;
  const { error: uploadError } = await auth.supabase.storage
    .from(BUCKET_NAME)
    .upload(newPath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await auth.supabase
    .from('profiles')
    .update({ avatar_path: newPath, updated_at: new Date().toISOString() })
    .eq('id', auth.user.id)
    .select('*')
    .single();

  if (error) {
    await auth.supabase.storage.from(BUCKET_NAME).remove([newPath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (oldPath && oldPath !== newPath) {
    await auth.supabase.storage.from(BUCKET_NAME).remove([oldPath]);
  }

  return NextResponse.json(withAvatarUrl(data));
}

export async function DELETE() {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from('profiles')
    .update({ avatar_path: null, updated_at: new Date().toISOString() })
    .eq('id', auth.user.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (auth.profile.avatar_path) {
    await auth.supabase.storage.from(BUCKET_NAME).remove([auth.profile.avatar_path]);
  }

  return NextResponse.json(withAvatarUrl(data));
}
