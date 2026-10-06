import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type PaymentType = 'cash' | 'credit';
type DocumentType = 'sales_slip' | 'invoice' | 'company_receipt';
const MAX_QUANTITY = 9_999_999.999;

function getSaleItemsValidationError(items: unknown): string | null {
  if (items === undefined || items === null) return null;
  if (!Array.isArray(items)) return 'Items must be an array';

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] as { quantity?: unknown };
    const rawQuantity = item?.quantity;
    const quantityText = String(rawQuantity ?? '');
    const quantity = Number(rawQuantity);
    const hasValidPrecision = /^\d{1,7}(?:\.\d{1,3})?$/.test(quantityText);

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY || !hasValidPrecision) {
      return `Invalid quantity at item ${index + 1}: use a positive number with no more than 3 decimal places`;
    }
  }

  return null;
}

function resolveDocumentType(paymentType: PaymentType, documentType?: DocumentType): DocumentType {
  return documentType || (paymentType === 'credit' ? 'invoice' : 'sales_slip');
}

function isValidSaleMethod(paymentType: PaymentType, documentType: DocumentType) {
  return paymentType === 'credit'
    ? documentType === 'invoice'
    : documentType === 'sales_slip' || documentType === 'company_receipt';
}

// GET all sales with items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filter by status (draft/completed)
    const documentType = searchParams.get('document_type');
    const paymentStatus = searchParams.get('payment_status');

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

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data: sales, error } = await query;

    if (error) throw error;

    // Transform to match our interface
    const transformedSales = sales?.map(sale => ({
      id: sale.id,
      document_number: sale.document_number,
      sale_date: sale.sale_date,
      total_amount: sale.total_amount,
      discount: sale.discount,
      net_amount: sale.net_amount,
      payment_type: sale.payment_type,
      document_type: sale.document_type || (sale.payment_type === 'credit' ? 'invoice' : 'sales_slip'),
      payment_status: sale.payment_status || (sale.payment_type === 'cash' ? 'paid' : 'unpaid'),
      paid_at: sale.paid_at,
      customer_id: sale.customer_id,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_address: sale.customer_address,
      amount_paid: sale.amount_paid,
      change_amount: sale.change_amount,
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
    const { sale_date, customer_id, customer_name, customer_phone, customer_address, total_amount, discount, net_amount, payment_type, document_type, amount_paid, change_amount, status, items } = body;
    const resolvedDocumentType = resolveDocumentType(payment_type, document_type);
    const itemsValidationError = getSaleItemsValidationError(items);

    if (itemsValidationError) {
      return NextResponse.json({ error: itemsValidationError }, { status: 400 });
    }

    if (!isValidSaleMethod(payment_type, resolvedDocumentType)) {
      return NextResponse.json({ error: 'Invalid payment and document type combination' }, { status: 400 });
    }

    // Insert sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({ 
        sale_date,
        customer_id: customer_id || null,
        customer_name: customer_name?.trim() || null,
        customer_phone: customer_phone?.trim() || null,
        customer_address: customer_address?.trim() || null,
        total_amount, 
        discount, 
        net_amount, 
        payment_type,
        document_type: resolvedDocumentType,
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
        ...(item.product_id ? { product_id: item.product_id } : {}),
        product_name: item.product_name,
        barcode: item.barcode,
        unit_price: item.unit_price,
        quantity: Number(item.quantity),
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
    const { id, sale_date, customer_id, customer_name, customer_phone, customer_address, total_amount, discount, net_amount, payment_type, document_type, amount_paid, change_amount, status, items } = body;
    const resolvedDocumentType = resolveDocumentType(payment_type, document_type);
    const itemsValidationError = getSaleItemsValidationError(items);

    if (itemsValidationError) {
      return NextResponse.json({ error: itemsValidationError }, { status: 400 });
    }

    if (!isValidSaleMethod(payment_type, resolvedDocumentType)) {
      return NextResponse.json({ error: 'Invalid payment and document type combination' }, { status: 400 });
    }

    // Update sale
    const { error: saleError } = await supabase
      .from('sales')
      .update({ 
        sale_date,
        customer_id: customer_id || null,
        customer_name: customer_name?.trim() || null,
        customer_phone: customer_phone?.trim() || null,
        customer_address: customer_address?.trim() || null,
        total_amount, 
        discount, 
        net_amount, 
        payment_type,
        document_type: resolvedDocumentType,
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
        ...(item.product_id ? { product_id: item.product_id } : {}),
        product_name: item.product_name,
        barcode: item.barcode,
        unit_price: item.unit_price,
        quantity: Number(item.quantity),
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

// PATCH update invoice payment status without replacing sale items
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, payment_status } = body as {
      id?: string;
      payment_status?: 'unpaid' | 'paid';
    };

    if (!id || !payment_status || !['unpaid', 'paid'].includes(payment_status)) {
      return NextResponse.json({ error: 'Valid id and payment_status are required' }, { status: 400 });
    }

    const { data: existingSale, error: findError } = await supabase
      .from('sales')
      .select('id, net_amount, status, document_type')
      .eq('id', id)
      .eq('status', 'completed')
      .eq('document_type', 'invoice')
      .single();

    if (findError || !existingSale) {
      return NextResponse.json({ error: 'Completed invoice not found' }, { status: 404 });
    }

    const paidAt = payment_status === 'paid' ? new Date().toISOString() : null;
    const { data: updatedSale, error: updateError } = await supabase
      .from('sales')
      .update({
        payment_status,
        paid_at: paidAt,
        amount_paid: payment_status === 'paid' ? existingSale.net_amount : 0,
        change_amount: 0,
      })
      .eq('id', id)
      .select(`
        *,
        sale_items (*)
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      ...updatedSale,
      items: updatedSale.sale_items || [],
    });
  } catch (error) {
    console.error('Error updating invoice payment status:', error);
    return NextResponse.json({ error: 'Failed to update invoice payment status' }, { status: 500 });
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
