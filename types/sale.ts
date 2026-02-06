export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_name: string;
  barcode?: string;
  unit_price: number; // ราคาที่ขาย ณ ตอนนั้น
  quantity: number;
  total_price: number;
  created_at?: string;
}

export interface Sale {
  id?: string;
  sale_date: string;
  customer_name?: string; // ชื่อลูกค้า (required สำหรับ credit)
  total_amount: number;
  discount: number;
  net_amount: number;
  payment_type: 'cash' | 'credit';
  amount_paid?: number; // จำนวนเงินที่ลูกค้าจ่าย (สำหรับเงินสด)
  change_amount?: number; // เงินทอน (คำนวณจาก amount_paid - net_amount)
  status: 'draft' | 'completed';
  items: SaleItem[];
  created_at?: string;
  updated_at?: string;
}
