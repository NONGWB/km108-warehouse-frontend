import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PUT toggle item completion status
export async function PUT(request: Request) {
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
