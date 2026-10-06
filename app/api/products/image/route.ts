import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'product-images';
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getExtension(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

async function findProduct(productId: string) {
  return supabase
    .from('products')
    .select('id, image_path')
    .eq('id', productId)
    .single();
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();
    const productId = String(formData.get('product_id') || '').trim();
    const file = formData.get('file');

    if (!productId || !(file instanceof File)) {
      return NextResponse.json({ error: 'product_id and image file are required' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG และ WebP' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'รูปสินค้าต้องมีขนาดไม่เกิน 2 MB' }, { status: 400 });
    }

    const { data: product, error: findError } = await findProduct(productId);
    if (findError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    uploadedPath = `${productId}/${randomUUID()}.${getExtension(file.type)}`;
    const fileBytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uploadedPath, fileBytes, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_path: uploadedPath, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updateError) throw updateError;

    if (product.image_path && product.image_path !== uploadedPath) {
      const { error: removeOldError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([product.image_path]);

      if (removeOldError) {
        console.warn('New product image saved, but the old image could not be removed:', removeOldError);
      }
    }

    const imageUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadedPath).data.publicUrl;
    return NextResponse.json({ image_path: uploadedPath, image_url: imageUrl });
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from(BUCKET_NAME).remove([uploadedPath]);
    }

    console.error('Error uploading product image:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload product image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('product_id')?.trim();
    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const { data: product, error: findError } = await findProduct(productId);
    if (findError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_path: null, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updateError) throw updateError;

    if (product.image_path) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([product.image_path]);

      if (removeError) {
        console.warn('Product image was unlinked, but the file could not be removed:', removeError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing product image:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove product image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
