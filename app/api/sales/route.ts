import { NextResponse } from 'next/server';
import { authorizeApiRequest, MANAGER_ROLES } from '@/lib/apiAuth';
import { isManagerRole } from '@/types/auth';

type PaymentType = 'cash' | 'credit';
type DocumentType = 'sales_slip' | 'invoice' | 'company_receipt';
type SaleStatus = 'draft' | 'completed';

interface CheckoutItemInput {
  product_id?: unknown;
  quantity?: unknown;
  unit_price?: unknown;
}

interface SaleRequestBody {
  id?: string;
  idempotency_key?: string;
  sale_date?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  discount?: number;
  payment_type?: PaymentType;
  document_type?: DocumentType;
  amount_paid?: number;
  status?: SaleStatus;
  items?: CheckoutItemInput[];
  action?: string;
  payment_status?: 'paid' | 'unpaid';
  reason?: string;
}

interface SaleRpcError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

const MAX_QUANTITY = 9_999_999.999;

function resolveDocumentType(paymentType?: PaymentType, documentType?: DocumentType): DocumentType | undefined {
  return documentType || (paymentType === 'credit' ? 'invoice' : paymentType === 'cash' ? 'sales_slip' : undefined);
}

function validateSaleInput(body: SaleRequestBody): string | null {
  if (!body.payment_type || !['cash', 'credit'].includes(body.payment_type)) {
    return 'กรุณาระบุวิธีชำระเงินให้ถูกต้อง';
  }

  const documentType = resolveDocumentType(body.payment_type, body.document_type);
  const validDocument = body.payment_type === 'credit'
    ? documentType === 'invoice'
    : documentType === 'sales_slip' || documentType === 'company_receipt';
  if (!validDocument) return 'ประเภทเอกสารไม่ตรงกับวิธีชำระเงิน';

  if (!body.status || !['draft', 'completed'].includes(body.status)) {
    return 'สถานะการขายไม่ถูกต้อง';
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ';
  }

  for (let index = 0; index < body.items.length; index += 1) {
    const item = body.items[index];
    if (!item.product_id || typeof item.product_id !== 'string') {
      return `สินค้าแถวที่ ${index + 1} ไม่มี product_id`;
    }

    const quantityText = String(item.quantity ?? '');
    const quantity = Number(item.quantity);
    if (!/^\d{1,7}(?:\.\d{1,3})?$/.test(quantityText)
      || !Number.isFinite(quantity)
      || quantity <= 0
      || quantity > MAX_QUANTITY) {
      return `จำนวนสินค้าแถวที่ ${index + 1} ไม่ถูกต้อง`;
    }

    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return `ราคาสินค้าแถวที่ ${index + 1} ไม่ถูกต้อง`;
    }
  }

  return null;
}

function rpcErrorResponse(error: SaleRpcError | null) {
  const rawMessage = [error?.message, error?.details].filter(Boolean).join(' ');
  const mappings: Array<[string, string, number]> = [
    ['PGRST202', 'ยังไม่ได้ติดตั้ง Sale RPC ครบ กรุณารัน scripts/harden-sales-transactions.sql ทั้งไฟล์อีกครั้ง', 503],
    ['PGRST203', 'พบ Sale RPC ซ้ำหรือ signature ไม่ตรง กรุณารัน migration เวอร์ชันล่าสุดทั้งไฟล์อีกครั้ง', 503],
    ['42P01', 'โครงสร้างตารางสำหรับการขายยังไม่ครบ กรุณารัน migration เวอร์ชันล่าสุดทั้งไฟล์อีกครั้ง', 503],
    ['42703', 'คอลัมน์สำหรับการขายยังไม่ครบ กรุณารัน migration เวอร์ชันล่าสุดทั้งไฟล์อีกครั้ง', 503],
    ['42883', 'ฟังก์ชันฐานข้อมูลสำหรับการขายยังไม่ครบ กรุณารัน migration เวอร์ชันล่าสุดทั้งไฟล์อีกครั้ง', 503],
    ['schema cache', 'Supabase ยังไม่พบ Sale RPC ใน schema cache กรุณารัน migration เวอร์ชันล่าสุดอีกครั้ง', 503],
    ['Could not find the function', 'ยังไม่ได้ติดตั้ง Sale RPC ครบ กรุณารัน migration เวอร์ชันล่าสุดทั้งไฟล์อีกครั้ง', 503],
    ['PRICE_CHANGED', 'ราคาสินค้ามีการเปลี่ยนแปลง กรุณาโหลดสินค้าใหม่แล้วตรวจสอบราคาอีกครั้ง', 409],
    ['IDEMPOTENCY_KEY_REQUIRED', 'ไม่พบรหัสป้องกันบิลซ้ำ กรุณาลองใหม่อีกครั้ง', 400],
    ['ITEMS_REQUIRED', 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ', 400],
    ['PRODUCT_ID_REQUIRED', 'รายการสินค้าบางรายการไม่มี product_id', 400],
    ['PRODUCT_NOT_FOUND', 'ไม่พบสินค้าบางรายการ กรุณาโหลดสินค้าใหม่', 404],
    ['INVALID_QUANTITY', 'จำนวนสินค้าไม่ถูกต้อง', 400],
    ['INVALID_DISCOUNT', 'ส่วนลดไม่ถูกต้องหรือมากกว่ายอดรวม', 400],
    ['INSUFFICIENT_PAYMENT', 'จำนวนเงินที่รับมาน้อยกว่ายอดสุทธิ', 400],
    ['CUSTOMER_NOT_FOUND', 'ไม่พบข้อมูลลูกค้าที่เลือก', 404],
    ['CUSTOMER_NAME_REQUIRED', 'เอกสารประเภทนี้ต้องระบุชื่อลูกค้า', 400],
    ['SALE_NOT_DRAFT', 'แก้ไขได้เฉพาะบิลฉบับร่างเท่านั้น', 409],
    ['SALE_NOT_FOUND', 'ไม่พบรายการขาย', 404],
    ['COMPLETED_INVOICE_NOT_FOUND', 'ไม่พบใบแจ้งหนี้ที่แก้ไขสถานะการชำระได้', 404],
    ['COMPLETED_SALE_NOT_FOUND', 'ไม่พบบิลที่สามารถยกเลิกได้', 404],
    ['VOID_REASON_REQUIRED', 'กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 3 ตัวอักษร', 400],
    ['MANAGER_REQUIRED', 'เฉพาะ Admin หรือ Shop Owner เท่านั้นที่ยกเลิกบิลได้', 403],
    ['ACTIVE_USER_REQUIRED', 'บัญชีผู้ใช้ไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบใหม่', 401],
    ['COMPLETED_SALE_CANNOT_BE_DELETED', 'บิลที่ปิดการขายแล้วห้ามลบ ให้ใช้การยกเลิกบิลแทน', 409],
  ];

  const mapped = mappings.find(([code]) => error?.code === code || rawMessage.includes(code));
  const diagnosticCodes = ['PGRST202', 'PGRST203', '42P01', '42703', '42883'];
  const canExposeDiagnostic = process.env.NODE_ENV === 'development'
    || Boolean(error?.code && diagnosticCodes.includes(error.code));
  const developmentDetails = canExposeDiagnostic && error
    ? {
        diagnostic: {
          code: error.code || null,
          message: error.message || null,
          details: error.details || null,
          hint: error.hint || null,
        },
      }
    : {};
  if (mapped) {
    return NextResponse.json({ error: mapped[1], ...developmentDetails }, { status: mapped[2] });
  }

  console.error('Sale RPC error:', error);
  return NextResponse.json(
    { error: 'ไม่สามารถบันทึกข้อมูลการขายได้', ...developmentDetails },
    { status: 500 },
  );
}

function saleRpcParams(body: SaleRequestBody) {
  return {
    p_sale_date: body.sale_date || null,
    p_customer_id: body.customer_id || null,
    p_customer_name: body.customer_name?.trim() || null,
    p_customer_phone: body.customer_phone?.trim() || null,
    p_customer_address: body.customer_address?.trim() || null,
    p_discount: Number(body.discount || 0),
    p_payment_type: body.payment_type,
    p_document_type: resolveDocumentType(body.payment_type, body.document_type),
    p_amount_paid: Number(body.amount_paid || 0),
    p_status: body.status,
    p_items: (body.items || []).map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity),
      // Used only to detect a price change. The database remains authoritative.
      unit_price: Number(item.unit_price),
    })),
  };
}

function normalizeSale(sale: Record<string, unknown>) {
  const saleItems = sale.sale_items;
  const { sale_items: _saleItems, ...rest } = sale;
  void _saleItems;
  return {
    ...rest,
    document_type: sale.document_type || (sale.payment_type === 'credit' ? 'invoice' : 'sales_slip'),
    payment_status: sale.payment_status || (sale.payment_type === 'cash' ? 'paid' : 'unpaid'),
    items: Array.isArray(sale.items) ? sale.items : (Array.isArray(saleItems) ? saleItems : []),
  };
}

export async function GET(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const statuses = searchParams.get('status')?.split(',').map((value) => value.trim()).filter(Boolean) || [];
    const documentType = searchParams.get('document_type');
    const paymentStatus = searchParams.get('payment_status');

    let query = auth.supabase
      .from('sales')
      .select('*, sale_items (*)')
      .order('updated_at', { ascending: false })
      .order('sale_date', { ascending: false });

    if (statuses.length === 1) query = query.eq('status', statuses[0]);
    if (statuses.length > 1) query = query.in('status', statuses);
    if (documentType) query = query.eq('document_type', documentType);
    if (paymentStatus) query = query.eq('payment_status', paymentStatus);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json((data || []).map((sale) => normalizeSale(sale)));
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดข้อมูลการขายได้' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as SaleRequestBody;
    const validationError = validateSaleInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    if (!body.idempotency_key) {
      return NextResponse.json({ error: 'ไม่พบรหัสป้องกันบิลซ้ำ กรุณาลองใหม่อีกครั้ง' }, { status: 400 });
    }

    const { data, error } = await auth.supabase.rpc('create_sale_transaction', {
      p_idempotency_key: body.idempotency_key,
      ...saleRpcParams(body),
    });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้างรายการขายได้' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as SaleRequestBody;
    if (!body.id) return NextResponse.json({ error: 'ไม่พบรหัสรายการขาย' }, { status: 400 });
    const validationError = validateSaleInput(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const { data, error } = await auth.supabase.rpc('update_draft_sale_transaction', {
      p_sale_id: body.id,
      ...saleRpcParams(body),
    });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'ไม่สามารถแก้ไขรายการขายได้' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as SaleRequestBody;
    if (!body.id) return NextResponse.json({ error: 'ไม่พบรหัสรายการขาย' }, { status: 400 });

    if (body.action === 'void') {
      if (!isManagerRole(auth.profile.role)) {
        return NextResponse.json({ error: 'เฉพาะ Admin หรือ Shop Owner เท่านั้นที่ยกเลิกบิลได้' }, { status: 403 });
      }
      const { data, error } = await auth.supabase.rpc('void_sale_transaction', {
        p_sale_id: body.id,
        p_reason: body.reason || '',
      });
      if (error) return rpcErrorResponse(error);
      return NextResponse.json(data);
    }

    if (!body.payment_status || !['paid', 'unpaid'].includes(body.payment_status)) {
      return NextResponse.json({ error: 'สถานะการชำระเงินไม่ถูกต้อง' }, { status: 400 });
    }
    const { data, error } = await auth.supabase.rpc('set_invoice_payment_status_transaction', {
      p_sale_id: body.id,
      p_payment_status: body.payment_status,
    });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating sale status:', error);
    return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนสถานะรายการขายได้' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeApiRequest(MANAGER_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ไม่พบรหัสรายการขาย' }, { status: 400 });

    const { error } = await auth.supabase.rpc('delete_draft_sale_transaction', { p_sale_id: id });
    if (error) return rpcErrorResponse(error);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบฉบับร่างได้' }, { status: 500 });
  }
}
