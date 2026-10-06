import type { SupabaseClient } from '@supabase/supabase-js';
import { Product } from '@/types/product';

// Database row type (snake_case from Postgres)
interface ProductRow {
  id?: string;
  product_name: string;
  barcode?: string;
  image_path?: string | null;
  sale_price: number;
  store1_name: string;
  store1_price: number;
  store2_name: string;
  store2_price: number;
  store3_name: string;
  store3_price: number;
  store4_name: string;
  store4_price: number;
  created_at?: string;
  updated_at?: string;
}

// Convert Product (PascalCase) to ProductRow (snake_case)
function toRow(product: Product): ProductRow {
  return {
    product_name: product.ProductName,
    barcode: product.barcode || '',
    sale_price: product.SalePrice || 0,
    store1_name: product.Store1Name || '',
    store1_price: product.Store1Price || 0,
    store2_name: product.Store2Name || '',
    store2_price: product.Store2Price || 0,
    store3_name: product.Store3Name || '',
    store3_price: product.Store3Price || 0,
    store4_name: product.Store4Name || '',
    store4_price: product.Store4Price || 0,
    updated_at: new Date().toISOString(),
  };
}

// Convert ProductRow (snake_case) to Product (PascalCase)
function toProduct(row: ProductRow, supabase: SupabaseClient): Product {
  const imageUrl = row.image_path
    ? supabase.storage.from('product-images').getPublicUrl(row.image_path).data.publicUrl
    : null;

  return {
    id: row.id,
    ProductName: row.product_name,
    barcode: row.barcode,
    image_path: row.image_path || null,
    image_url: imageUrl,
    SalePrice: row.sale_price,
    Store1Name: row.store1_name,
    Store1Price: row.store1_price,
    Store2Name: row.store2_name,
    Store2Price: row.store2_price,
    Store3Name: row.store3_name,
    Store3Price: row.store3_price,
    Store4Name: row.store4_name,
    Store4Price: row.store4_price,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function readProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error reading products:', error);
    throw new Error('Failed to read products from database');
  }

  return (data || []).map((row) => toProduct(row, supabase));
}

export async function addProduct(supabase: SupabaseClient, product: Product): Promise<Product> {
  const row = toRow(product);
  
  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Error adding product:', error);
    throw new Error(error.message || 'Failed to add product');
  }

  return toProduct(data, supabase);
}

export async function updateProduct(
  supabase: SupabaseClient,
  productName: string,
  updatedProduct: Product
): Promise<Product | null> {
  const row = toRow(updatedProduct);
  
  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('product_name', productName)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(error.message || 'Failed to update product');
  }

  return toProduct(data, supabase);
}

export async function deleteProduct(supabase: SupabaseClient, productName: string): Promise<boolean> {
  const { data: product, error: findError } = await supabase
    .from('products')
    .select('id, image_path')
    .eq('product_name', productName)
    .maybeSingle();

  if (findError) {
    console.error('Error finding product before delete:', findError);
    throw new Error(findError.message || 'Failed to find product');
  }

  if (!product) return false;

  const { error, count } = await supabase
    .from('products')
    .delete({ count: 'exact' })
    .eq('id', product.id);

  if (error) {
    console.error('Error deleting product:', error);
    throw new Error(error.message || 'Failed to delete product');
  }

  const deleted = (count || 0) > 0;

  if (deleted && product.image_path) {
    const { error: imageError } = await supabase.storage
      .from('product-images')
      .remove([product.image_path]);

    if (imageError) {
      console.warn('Product deleted, but its image could not be removed:', imageError);
    }
  }

  return deleted;
}

export async function bulkInsertProducts(supabase: SupabaseClient, products: Product[]): Promise<number> {
  const rows = products.map(toRow);
  
  const { data, error } = await supabase
    .from('products')
    .insert(rows)
    .select();

  if (error) {
    console.error('Error bulk inserting products:', error);
    throw new Error(error.message || 'Failed to bulk insert products');
  }

  return data?.length || 0;
}
