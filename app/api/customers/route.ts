import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { CustomerType } from '@/types/customer';

const normalizeCustomer = (body: Record<string, unknown>) => {
  const customerType = body.customer_type as CustomerType;
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : '';

  if (!['individual', 'corporate'].includes(customerType)) {
    throw new Error('INVALID_CUSTOMER_TYPE');
  }
  if (customerType === 'individual' && !fullName) {
    throw new Error('FULL_NAME_REQUIRED');
  }
  if (customerType === 'corporate' && !companyName) {
    throw new Error('COMPANY_NAME_REQUIRED');
  }

  return {
    customer_type: customerType,
    full_name: customerType === 'individual' ? fullName : null,
    company_name: customerType === 'corporate' ? companyName : null,
    address: typeof body.address === 'string' ? body.address.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
  };
};

const validationResponse = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  const messages: Record<string, string> = {
    INVALID_CUSTOMER_TYPE: 'Invalid customer type',
    FULL_NAME_REQUIRED: 'Full name is required',
    COMPANY_NAME_REQUIRED: 'Company name is required',
  };
  return messages[error.message]
    ? NextResponse.json({ error: messages[error.message] }, { status: 400 })
    : null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();

    let query = supabase
      .from('customers')
      .select('*')
      .order('updated_at', { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[,%()]/g, ' ').trim();
      if (safeSearch) {
        query = query.or(
          `full_name.ilike.%${safeSearch}%,company_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`,
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = normalizeCustomer(body);
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const response = validationResponse(error);
    if (response) return response;
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const customer = normalizeCustomer(body);
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const response = validationResponse(error);
    if (response) return response;
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
