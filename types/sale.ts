export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id?: string | null;
  product_name: string;
  barcode?: string;
  unit_price: number; // ราคาที่ขาย ณ ตอนนั้น
  quantity: number; // รองรับจำนวนแบบชั่งน้ำหนัก สูงสุด 3 ตำแหน่งทศนิยม
  total_price: number;
  created_at?: string;
}

export interface Sale {
  id?: string;
  idempotency_key?: string | null;
  document_number?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  sale_date: string;
  customer_id?: string | null;
  customer_name?: string; // ชื่อลูกค้า (required สำหรับ credit)
  customer_phone?: string | null;
  customer_address?: string | null;
  total_amount: number;
  discount: number;
  net_amount: number;
  payment_type: 'cash' | 'credit';
  document_type: 'sales_slip' | 'invoice' | 'company_receipt';
  payment_status?: 'unpaid' | 'paid';
  paid_at?: string | null;
  paid_by?: string | null;
  paid_by_name?: string | null;
  amount_paid?: number; // จำนวนเงินที่ลูกค้าจ่าย (สำหรับเงินสด)
  change_amount?: number; // เงินทอน (คำนวณจาก amount_paid - net_amount)
  status: 'draft' | 'completed' | 'voided';
  voided_at?: string | null;
  voided_by?: string | null;
  voided_by_name?: string | null;
  void_reason?: string | null;
  items: SaleItem[];
  created_at?: string;
  updated_at?: string;
}
