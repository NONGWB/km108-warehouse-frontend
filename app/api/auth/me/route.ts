import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/apiAuth';

export async function GET() {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;
  return NextResponse.json(auth.profile);
}
