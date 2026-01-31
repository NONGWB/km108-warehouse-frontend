import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all order notes with items
export async function GET() {
  try {
    const { data: notes, error } = await supabase
      .from('order_notes')
      .select(`
        *,
        order_note_items (*)
      `)
      .order('updated_at', { ascending: false })
      .order('note_date', { ascending: false });

    if (error) throw error;

    // Transform to match our interface
    const transformedNotes = notes?.map(note => ({
      id: note.id,
      note_name: note.note_name,
      note_date: note.note_date,
      created_at: note.created_at,
      updated_at: note.updated_at,
      items: note.order_note_items || []
    })) || [];

    return NextResponse.json(transformedNotes);
  } catch (error) {
    console.error('Error fetching order notes:', error);
    return NextResponse.json({ error: 'Failed to fetch order notes' }, { status: 500 });
  }
}

// POST create new order note with items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { note_name, note_date, items } = body;

    // Insert order note
    const { data: note, error: noteError } = await supabase
      .from('order_notes')
      .insert({ note_name, note_date })
      .select()
      .single();

    if (noteError) throw noteError;

    // Insert items if any
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        order_note_id: note.id,
        item_name: item.item_name,
        is_completed: item.is_completed || false
      }));

      const { error: itemsError } = await supabase
        .from('order_note_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Fetch the complete note with items
    const { data: completeNote, error: fetchError } = await supabase
      .from('order_notes')
      .select(`
        *,
        order_note_items (*)
      `)
      .eq('id', note.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      ...completeNote,
      items: completeNote.order_note_items || []
    });
  } catch (error) {
    console.error('Error creating order note:', error);
    return NextResponse.json({ error: 'Failed to create order note' }, { status: 500 });
  }
}

// PUT update order note with items
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, note_name, note_date, items } = body;

    // Update order note
    const { error: noteError } = await supabase
      .from('order_notes')
      .update({ note_name, note_date })
      .eq('id', id);

    if (noteError) throw noteError;

    // Delete existing items and insert new ones
    const { error: deleteError } = await supabase
      .from('order_note_items')
      .delete()
      .eq('order_note_id', id);

    if (deleteError) throw deleteError;

    // Insert new items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        order_note_id: id,
        item_name: item.item_name,
        is_completed: item.is_completed || false
      }));

      const { error: itemsError } = await supabase
        .from('order_note_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Fetch the updated note with items
    const { data: updatedNote, error: fetchError } = await supabase
      .from('order_notes')
      .select(`
        *,
        order_note_items (*)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      ...updatedNote,
      items: updatedNote.order_note_items || []
    });
  } catch (error) {
    console.error('Error updating order note:', error);
    return NextResponse.json({ error: 'Failed to update order note' }, { status: 500 });
  }
}

// DELETE order note (items will cascade delete)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('order_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order note:', error);
    return NextResponse.json({ error: 'Failed to delete order note' }, { status: 500 });
  }
}
