import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/apiAuth';

// PUT toggle item completion status
export async function PUT(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;
  const supabase = auth.supabase;
  try {
    const body = await request.json();
    const { id, is_completed } = body;

    const { data, error } = await supabase
      .from('order_note_items')
      .update({ is_completed })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error toggling item:', error);
    return NextResponse.json({ error: 'Failed to toggle item' }, { status: 500 });
  }
}
