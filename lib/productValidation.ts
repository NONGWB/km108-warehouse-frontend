import type { Product } from '@/types/product';

export const PRODUCT_FIELD_MAX_LENGTHS = {
  ProductName: 255,
  barcode: 100,
  Store1Name: 255,
  Store2Name: 255,
  Store3Name: 255,
  Store4Name: 255,
} as const;

export const PRODUCT_PRICE_MAX = 99_999_999.99;

const textFieldLabels: Record<keyof typeof PRODUCT_FIELD_MAX_LENGTHS, string> = {
  ProductName: 'ชื่อสินค้า',
  barcode: 'บาร์โค้ด',
  Store1Name: 'ชื่อร้านที่ 1',
  Store2Name: 'ชื่อร้านที่ 2',
  Store3Name: 'ชื่อร้านที่ 3',
  Store4Name: 'ชื่อร้านที่ 4',
};

const priceFields = [
  'SalePrice',
  'Store1Price',
  'Store2Price',
  'Store3Price',
  'Store4Price',
] as const satisfies readonly (keyof Product)[];

const priceFieldLabels: Record<(typeof priceFields)[number], string> = {
  SalePrice: 'ราคาขาย',
  Store1Price: 'ราคาร้านที่ 1',
  Store2Price: 'ราคาร้านที่ 2',
  Store3Price: 'ราคาร้านที่ 3',
  Store4Price: 'ราคาร้านที่ 4',
};

export function getProductValidationError(product: Partial<Product>): string | null {
  if (typeof product.ProductName !== 'string' || !product.ProductName.trim()) {
    return 'กรุณากรอกชื่อสินค้า';
  }

  for (const field of Object.keys(PRODUCT_FIELD_MAX_LENGTHS) as Array<keyof typeof PRODUCT_FIELD_MAX_LENGTHS>) {
    const value = product[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return `${textFieldLabels[field]}ต้องเป็นข้อความ`;
    }

    const length = typeof value === 'string' ? Array.from(value).length : 0;
    const maxLength = PRODUCT_FIELD_MAX_LENGTHS[field];
    if (length > maxLength) {
      return `${textFieldLabels[field]}ต้องไม่เกิน ${maxLength} ตัวอักษร`;
    }
  }

  for (const field of priceFields) {
    const rawValue = product[field] ?? 0;
    const numericValue = Number(rawValue);
    const normalizedValue = String(rawValue);
    const hasValidScale = /^\d+(?:\.\d{1,2})?$/.test(normalizedValue);

    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > PRODUCT_PRICE_MAX || !hasValidScale) {
      return `${priceFieldLabels[field]}ต้องอยู่ระหว่าง 0 ถึง 99,999,999.99 และมีทศนิยมไม่เกิน 2 ตำแหน่ง`;
    }
  }

  return null;
}
