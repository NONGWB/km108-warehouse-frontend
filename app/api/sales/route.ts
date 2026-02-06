import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all sales with items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filter by status (draft/completed)

    let query = supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .order('updated_at', { ascending: false })
      .order('sale_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sales, error } = await query;

    if (error) throw error;

    // Transform to match our interface
    const transformedSales = sales?.map(sale => ({
      id: sale.id,
      sale_date: sale.sale_date,
      total_amount: sale.total_amount,
      discount: sale.discount,
      net_amount: sale.net_amount,
      payment_type: sale.payment_type,
      status: sale.status,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      items: sale.sale_items || []
    })) || [];

    return NextResponse.json(transformedSales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

// POST create new sale with items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sale_date, customer_name, total_amount, discount, net_amount, payment_type, amount_paid, change_amount, status, items } = body;

    // Insert sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({ 
        sale_date,
        customer_name: customer_name || 'customer1',
        total_amount, 
        discount, 
        net_amount, 
        payment_type,
        amount_paid: amount_paid || 0,
        change_amount: change_amount || 0,
        status 
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Insert items if any
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        sale_id: sale.id,
        product_name: item.product_name,
        barcode: item.barcode,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Fetch the complete sale with items
    const { data: completeSale, error: fetchError } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .eq('id', sale.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      ...completeSale,
      items: completeSale.sale_items || []
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

// PUT update sale with items
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, sale_date, customer_name, total_amount, discount, net_amount, payment_type, amount_paid, change_amount, status, items } = body;

    // Update sale
    const { error: saleError } = await supabase
      .from('sales')
      .update({ 
        sale_date,
        customer_name: customer_name || 'customer1',
        total_amount, 
        discount, 
        net_amount, 
        payment_type,
        amount_paid: amount_paid || 0,
        change_amount: change_amount || 0,
        status 
      })
      .eq('id', id);

    if (saleError) throw saleError;

    // Delete existing items and insert new ones
    const { error: deleteError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (deleteError) throw deleteError;

    // Insert new items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        sale_id: id,
        product_name: item.product_name,
        barcode: item.barcode,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Fetch the updated sale with items
    const { data: updatedSale, error: fetchError } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      ...updatedSale,
      items: updatedSale.sale_items || []
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}

// DELETE sale (items will cascade delete)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
